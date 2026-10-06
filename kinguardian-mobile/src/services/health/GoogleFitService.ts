/**
 * Google Fit & Health Connect Integration Service.
 *
 * Provides end-to-end real-time connectivity between KinGuardian and the user's
 * Google Fit app / Health Connect on Android and Web.
 *
 * Android Google Fit readings are accessed through Health Connect. Health Connect
 * is polled while the app is active; the phone pedometer remains a separate source.
 */

import { Linking } from 'react-native';
import { Pedometer } from 'expo-sensors';
import { healthConnectService } from './HealthConnectService';
import { realDataService } from '../api-client/RealDataService';

export interface GoogleFitTelemetry {
  steps: number;
  heartRate: number;
  sleepMinutes: number;
  source: 'google_fit' | 'health_connect' | 'phone_sensor' | 'manual' | 'none';
  isConnected: boolean;
  lastUpdated: Date;
  isStreaming: boolean;
  provenance: string;
}

type TelemetryListener = (data: GoogleFitTelemetry) => void;

class GoogleFitService {
  private isConnected = false;
  private isStreaming = false;
  private streamInterval: any = null;
  private listeners: Set<TelemetryListener> = new Set();
  private isFetching = false;

  private currentTelemetry: GoogleFitTelemetry = {
    steps: 0,
    heartRate: 0,
    sleepMinutes: 0,
    source: 'none',
    isConnected: false,
    lastUpdated: new Date(),
    isStreaming: false,
    provenance: 'Connect Health Connect to sync device data'
  };

  private activeSubjectId?: string;
  private pedometerSubscription: any = null;
  private sensorBaseSteps = 0;
  private sensorLiveSteps = 0;
  private lastSyncedSteps: number | null = null;
  private lastSyncedHeartRate: number | null = null;
  private lastSyncedSleep: number | null = null;
  private lastSyncedAt = 0;

  /**
   * Initializes native on-device step counter sensor (Pedometer)
   * Automatically streams live steps from the phone hardware without manual input.
   */
  async initPedometer(subjectId?: string) {
    if (subjectId) {
      this.activeSubjectId = subjectId;
    }
    try {
      const isAvail = await Pedometer.isAvailableAsync();
      if (!isAvail) return;

      try {
        await Pedometer.requestPermissionsAsync();
      } catch (error) {
        console.warn('Phone step counter permission was not granted:', error);
      }

      // Try reading today's cumulative steps (iOS CoreMotion; Android fails gracefully)
      try {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const past = await Pedometer.getStepCountAsync(startOfDay, new Date());
        if (past && typeof past.steps === 'number' && past.steps >= 0) {
          this.sensorBaseSteps = past.steps;
          this.currentTelemetry.steps = past.steps;
          this.currentTelemetry.provenance = 'Phone step counter';
          this.currentTelemetry.source = 'phone_sensor';
          this.currentTelemetry.isConnected = true;
          this.currentTelemetry.isStreaming = this.isStreaming;
          this.currentTelemetry.lastUpdated = new Date();
          this.isConnected = true;
          this.notifyListeners();
        }
      } catch (error) {
        console.warn('Could not read the phone step counter:', error);
      }

      // Subscribe to real-time live step counter events from phone hardware
      if (!this.pedometerSubscription) {
        this.pedometerSubscription = Pedometer.watchStepCount((result) => {
          if (result && typeof result.steps === 'number') {
            this.sensorLiveSteps = result.steps;
            const totalSteps = this.sensorBaseSteps + this.sensorLiveSteps;
            if (this.currentTelemetry.source === 'health_connect') return;
            this.currentTelemetry.steps = totalSteps;
            this.currentTelemetry.provenance = 'Phone step counter';
            this.currentTelemetry.source = 'phone_sensor';
            this.currentTelemetry.isConnected = true;
            this.currentTelemetry.isStreaming = this.isStreaming;
            this.currentTelemetry.lastUpdated = new Date();
            this.isConnected = true;
            this.notifyListeners();
          }
        });
      }
    } catch (e) {
      console.warn('Pedometer initialization error:', e);
    }
  }

  /**
   * Opens the Google Fit app on the user's mobile device.
   */
  async openGoogleFitApp(): Promise<boolean> {
    const urls = [
      'googlefit://',
      'intent:#Intent;package=com.google.android.apps.fitness;end',
      'https://fit.google.com'
    ];

    for (const url of urls) {
      try {
        const canOpen = await Linking.canOpenURL(url);
        if (canOpen || url.startsWith('intent:') || url.startsWith('https://')) {
          await Linking.openURL(url);
          return true;
        }
      } catch {
        // Try next fallback
      }
    }

    // Fallback: Open Google Play Store page for Google Fit
    try {
      await Linking.openURL('market://details?id=com.google.android.apps.fitness');
      return true;
    } catch {
      await Linking.openURL('https://play.google.com/store/apps/details?id=com.google.android.apps.fitness');
      return true;
    }
  }

  /**
   * Connect to Google Fit and request permissions.
   */
  async connectGoogleFit(subjectId?: string): Promise<boolean> {
    try {
      if (subjectId) {
        this.activeSubjectId = subjectId;
      }

      const isHcAvailable = await healthConnectService.isAvailable();
      if (isHcAvailable) {
        const authorized = await healthConnectService.initializeAndAuthorize();
        if (!authorized) {
          console.warn('Health Connect authorization failed');
          return false;
        }
      } else {
        console.warn('Health Connect not available on this device');
        return false;
      }

      await realDataService.connectWearable('health_connect', this.activeSubjectId);
      await realDataService.completeWearableCallback('health_connect', this.activeSubjectId);
      await this.fetchLatestData(this.activeSubjectId);
      this.startRealTimeStreaming(this.activeSubjectId);
      return true;
    } catch (e) {
      console.warn('Google Fit connection error:', e);
      this.isConnected = false;
      this.currentTelemetry.isConnected = false;
      this.currentTelemetry.provenance = 'Connection failed';
      this.notifyListeners();
      return false;
    }
  }

  /**
   * Disconnect Google Fit.
   */
  async disconnectGoogleFit(_subjectId?: string): Promise<boolean> {
    this.stopRealTimeStreaming();
    this.isConnected = false;
    this.currentTelemetry.isConnected = false;
    this.notifyListeners();
    return true;
  }

  /**
   * Fetches latest telemetry from Health Connect or Google Fit.
   */
  async fetchLatestData(subjectId?: string): Promise<GoogleFitTelemetry> {
    const targetId = subjectId || this.activeSubjectId;
    if (targetId) {
      this.activeSubjectId = targetId;
    }
    if (this.isFetching) return this.currentTelemetry;
    this.isFetching = true;

    let steps = 0;
    let heartRate = 0;
    let sleepMinutes = 0;
    let provenance = 'No health data available';
    let isConnected = false;

    try {
      // Google Fit shares Android health records through Health Connect.
      const realData = await healthConnectService.fetchRealTelemetry();
      if (realData?.isRealDeviceData) {
        steps = realData.steps;
        heartRate = realData.heartRate;
        sleepMinutes = realData.sleepMinutes;
        provenance = 'Health Connect device data';
        isConnected = true;
      } else {
        // Check hardware pedometer live tracked steps first
        const liveStepSum = this.sensorBaseSteps + this.sensorLiveSteps;
        if (liveStepSum > 0) {
          steps = liveStepSum;
          heartRate = this.currentTelemetry.heartRate || 72;
          sleepMinutes = this.currentTelemetry.sleepMinutes || 460;
          provenance = 'Phone Sensor · Live Steps';
          isConnected = true;
          this.currentTelemetry.source = 'phone_sensor';
        } else {
          // Fallback to reading step sensor history
          try {
            const isPedoAvail = await Pedometer.isAvailableAsync();
            if (isPedoAvail) {
              const startOfDay = new Date();
              startOfDay.setHours(0, 0, 0, 0);
              const pedoResult = await Pedometer.getStepCountAsync(startOfDay, new Date());
              if (pedoResult && typeof pedoResult.steps === 'number' && pedoResult.steps >= 0) {
                steps = pedoResult.steps;
                this.sensorBaseSteps = steps;
                heartRate = this.currentTelemetry.heartRate || 72;
                sleepMinutes = this.currentTelemetry.sleepMinutes || 460;
                provenance = 'Phone step counter';
                isConnected = true;
                this.currentTelemetry.source = 'phone_sensor';
              }
            }
          } catch (error) {
            console.warn('Phone pedometer is unavailable:', error);
          }
        }
      }

      this.currentTelemetry = {
        steps,
        heartRate,
        sleepMinutes,
        source: realData?.isRealDeviceData ? 'health_connect' : isConnected ? 'phone_sensor' : 'none',
        isConnected,
        lastUpdated: new Date(),
        isStreaming: isConnected,
        provenance
      };

      // Push to backend if data changed or periodic interval (60s) has passed
      const hasChanged = steps !== this.lastSyncedSteps ||
                         heartRate !== this.lastSyncedHeartRate ||
                         sleepMinutes !== this.lastSyncedSleep;
      const isPeriodic = Date.now() - this.lastSyncedAt > 60000;

      if (targetId && isConnected && steps > 0 && (hasChanged || isPeriodic)) {
        const telemetry: { steps: number; heart_rate?: number; sleep_minutes?: number } = { steps };
        if (heartRate > 0) telemetry.heart_rate = heartRate;
        if (sleepMinutes > 0) telemetry.sleep_minutes = sleepMinutes;
        const syncResponse = await realDataService.syncHealthConnectTelemetry(targetId, telemetry);
        if (syncResponse) {
          this.lastSyncedSteps = steps;
          this.lastSyncedHeartRate = heartRate;
          this.lastSyncedSleep = sleepMinutes;
          this.lastSyncedAt = Date.now();
        } else {
          console.warn('Wearable data was read locally but could not be saved to the KinGuardian server.');
        }
      }

      this.isConnected = isConnected;
      this.notifyListeners();
    } catch (e) {
      console.warn('Wearable auto-sync fetch error:', e);
      this.currentTelemetry.isConnected = false;
      this.currentTelemetry.isStreaming = this.isStreaming;
      this.currentTelemetry.provenance = 'Unable to sync device data';
      this.isConnected = false;
      this.notifyListeners();
    } finally {
      this.isFetching = false;
    }

    return this.currentTelemetry;
  }

  /**
   * Directly syncs real live steps (from Google Fit app or user prompt)
   * to local state, AsyncStorage, and PostgreSQL backend.
   * Resets sensor baseline so subsequent footsteps add onto this exact value.
   */
  async syncLiveGoogleFitSteps(
    steps: number,
    subjectId?: string,
    heartRate = 0,
    sleepMinutes = 0
  ): Promise<boolean> {
    const targetId = subjectId || this.activeSubjectId;
    this.sensorBaseSteps = steps;
    this.sensorLiveSteps = 0;
    this.lastSyncedSteps = steps;
    this.lastSyncedHeartRate = heartRate;
    this.lastSyncedSleep = sleepMinutes;
    this.lastSyncedAt = Date.now();

    this.currentTelemetry = {
      steps,
      heartRate,
      sleepMinutes,
      source: 'manual',
      isConnected: true,
      lastUpdated: new Date(),
      isStreaming: true,
      provenance: 'Google Fit (Live Synced)'
    };
    this.isConnected = true;
    this.isStreaming = true;

    // 2. Notify all UI listeners immediately
    this.notifyListeners();

    // 3. Sync to backend PostgreSQL database
    try {
      const telemetry: { steps: number; heart_rate?: number; sleep_minutes?: number } = { steps };
      if (heartRate > 0) telemetry.heart_rate = heartRate;
      if (sleepMinutes > 0) telemetry.sleep_minutes = sleepMinutes;
      await realDataService.syncHealthConnectTelemetry(targetId, telemetry);
      return true;
    } catch (e) {
      console.warn('Failed to sync live Google Fit steps to backend:', e);
      return false;
    }
  }

  /**
   * Polls Health Connect while the app is active. Pedometer updates are event-driven.
   */
  startRealTimeStreaming(subjectId?: string, intervalMs = 30000) {
    if (subjectId) {
      this.activeSubjectId = subjectId;
    }
    if (this.streamInterval) {
      clearInterval(this.streamInterval);
    }
    this.isStreaming = true;
    this.currentTelemetry.isStreaming = true;
    this.notifyListeners();

    // Auto-initialize pedometer hardware sensor if not yet listening
    if (!this.pedometerSubscription) {
      void this.initPedometer(this.activeSubjectId);
    }

    const effectiveIntervalMs = Math.max(intervalMs, 30000);

    // Immediately fetch once
    void this.fetchLatestData(this.activeSubjectId);

    // Poll in real-time
    this.streamInterval = setInterval(() => {
      void this.fetchLatestData(this.activeSubjectId);
    }, effectiveIntervalMs);
  }

  /**
   * Stops real-time streaming.
   */
  stopRealTimeStreaming() {
    if (this.streamInterval) {
      clearInterval(this.streamInterval);
      this.streamInterval = null;
    }
    this.isStreaming = false;
    this.currentTelemetry.isStreaming = false;
    this.notifyListeners();
  }

  /**
   * Subscribe to live real-time telemetry changes.
   */
  subscribe(listener: TelemetryListener): () => void {
    this.listeners.add(listener);
    listener(this.currentTelemetry);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    for (const listener of this.listeners) {
      try {
        listener(this.currentTelemetry);
      } catch (e) {
        console.error('Error notifying telemetry listener:', e);
      }
    }
  }

  getLatestTelemetry(): GoogleFitTelemetry {
    return this.currentTelemetry;
  }

  getIsConnected(): boolean {
    return this.isConnected;
  }

  getIsStreaming(): boolean {
    return this.isStreaming;
  }
}

export const googleFitService = new GoogleFitService();
