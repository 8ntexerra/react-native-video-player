#import "ScreenRecordingDetector.h"
#import "React/RCTLog.h"

@interface ScreenRecordingDetector()

@property BOOL lastRecordingState;
@property NSTimer *timer;

@end

@implementation ScreenRecordingDetector
{
  bool hasListeners;
  float timerInterval;
}

-(void)startObserving {
    hasListeners = YES;
    [self triggerDetectorTimer];
}

-(void)stopObserving {
    hasListeners = NO;
    [self stopDetectorTimer];
}

- (void) triggerDetectorTimer
{
    
if (self.timer) {
  [self stopDetectorTimer];
}
    
dispatch_async(dispatch_get_main_queue(), ^{
  self.timer = [NSTimer scheduledTimerWithTimeInterval:timerInterval
                                            target:self
                                            selector:@selector(checkCurrentRecordingStatus:)
                                            userInfo:nil
                                            repeats:YES];
});
}


- (void)stopDetectorTimer {
  if (self.timer) {
    [self.timer invalidate];
    self.timer = NULL;
  }
}

- (NSArray *)supportedEvents
{
  return @[@"RecordingStatusDidChange"];
}

+ (id)allocWithZone:(NSZone *)zone {
    static ScreenRecordingDetector *sharedInstance = nil;
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
        sharedInstance = [super allocWithZone:zone];
    });
    return sharedInstance;
}

+ (BOOL)requiresMainQueueSetup
{
    return YES;
}

- (id)init {
  if (self = [super init]) {
    self.lastRecordingState = NO;
    self.timer = NULL;
    timerInterval = 1;
  }
  return self;
}

- (BOOL)isRecording {
  for (UIScreen *screen in UIScreen.screens) {
    if ([screen respondsToSelector:@selector(isCaptured)]) {
      // iOS 11+ has isCaptured method.
      if ([screen performSelector:@selector(isCaptured)]) {
        return YES; // screen capture is active
      } else if (screen.mirroredScreen) {
        return YES; // mirroring is active
      }
    } else {
      // iOS version below 11.0
      if (screen.mirroredScreen)
        return YES;
    }
  }
  return NO;
}


- (void)checkCurrentRecordingStatus:(NSTimer *)timer {
  BOOL isRecording = [self isRecording];

  if (isRecording != self.lastRecordingState && hasListeners) {
      [self sendEventWithName:@"RecordingStatusDidChange" body:@{@"isRecording": @(self.isRecording)}];
  }

  self.lastRecordingState = isRecording;
}

RCT_EXPORT_MODULE();

RCT_REMAP_METHOD(getScreenRecordingStatus,
                 resolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
    resolve(@(self.isRecording));
}

@end

