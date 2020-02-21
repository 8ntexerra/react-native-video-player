#import <React/RCTBridgeModule.h>
#import <Foundation/Foundation.h>
#import <UIKit/UIKit.h>
#import <React/RCTEventEmitter.h>

@interface ScreenRecordingDetector : RCTEventEmitter

- (void)triggerDetectorTimer;
- (void)stopDetectorTimer;
- (BOOL)isRecording;
- (void)recordingStateWatcher:(BOOL)state;

@end
