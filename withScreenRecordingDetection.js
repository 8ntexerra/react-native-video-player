import React, { useState, useEffect } from 'react'
import ScreenRecordingDetector, { getScreenRecordingStatus } from 'react-native-screen-recording-detector'

const useScreenRecordingStatus = () => {
  const [recording, setRecording] = useState(false)
  getScreenRecordingStatus().then(isRecording => setRecording(isRecording))

  useEffect(() => {
    const subscription = ScreenRecordingDetector.addListener(
      'RecordingStatusDidChange',
      ({ isRecording }) => {
        setRecording(isRecording)
      }
    )

    return () => subscription.remove()
  }, [])

  return recording
}

export const withScreenRecordingDetection = Component =>
  React.forwardRef((props, ref) => {
    const isScreenRecording = useScreenRecordingStatus()

    return (
      <Component
        {...props}
        ref={ref}
        isScreenRecording={isScreenRecording}
      />
    )
  })
