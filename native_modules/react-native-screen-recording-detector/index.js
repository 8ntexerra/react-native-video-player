import { NativeModules, NativeEventEmitter } from 'react-native'

const { ScreenRecordingDetector } = NativeModules

export const getScreenRecordingStatus = () => ScreenRecordingDetector.getScreenRecordingStatus()

export default new NativeEventEmitter(ScreenRecordingDetector)
