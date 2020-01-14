import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  Image,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
  Text,
  ViewPropTypes,
  Animated
} from 'react-native'
import Icon from 'react-native-vector-icons/MaterialIcons';
import IconFA from 'react-native-fontawesome-pro';
import Video from 'react-native-video'; // eslint-disable-line

import { stats } from '../../src/services/stats'
import { isTablet } from '../../src/styles'

const styles = StyleSheet.create({
  preloadingPlaceholder: {
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnail: {
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playArrow: {
    color: 'white',
  },
  video: Platform.Version >= 24 ? {} : {
    backgroundColor: 'black',
  },
  controls: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    height: 48,
    marginTop: -48,
    flexDirection: 'row',
    alignItems: 'center',
  },
  playControl: {
    color: 'white',
    padding: 8,
  },
  extraControl: {
    color: 'white',
    padding: 8,
  },
  seekBar: {
    alignItems: 'center',
    height: 30,
    flexGrow: 1,
    flexDirection: 'row',
    paddingHorizontal: 10,
    marginLeft: -10,
    marginRight: -5,
  },
  seekBarFullWidth: {
    marginLeft: 0,
    marginRight: 0,
    paddingHorizontal: 0,
    marginTop: -3,
    height: 3,
  },
  seekBarProgress: {
    height: 3,
    backgroundColor: '#F00',
  },
  seekBarKnob: {
    width: 20,
    height: 20,
    marginHorizontal: -8,
    marginVertical: -10,
    borderRadius: 10,
    backgroundColor: '#F00',
    transform: [{ scale: 0.8 }],
    zIndex: 1,
  },
  seekBarBackground: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    height: 3,
  },
  overlayButton: {
    flex: 1,
  },
});

export default class VideoPlayer extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isStarted: props.autoplay,
      isPlaying: props.autoplay,
      width: 200,
      progress: 0,
      isMuted: props.defaultMuted,
      isControlsVisible: !props.hideControlsOnStart,
      duration: 0,
      isSeeking: false,
      stats: false
    };

    this.seekBarWidth = 200;
    this.wasPlayingBeforeSeek = false;
    this.seekTouchStart = 0;
    this.seekProgressStart = 0;
    // monkey patching
    this.playerMode = props.playerMode

    this.onLayout = this.onLayout.bind(this);
    this.onStartPress = this.onStartPress.bind(this);
    this.onProgress = this.onProgress.bind(this);
    this.onEnd = this.onEnd.bind(this);
    this.onLoad = this.onLoad.bind(this);
    this.onPlayPress = this.onPlayPress.bind(this);
    this.onMutePress = this.onMutePress.bind(this);
    this.showControls = this.showControls.bind(this);
    this.onToggleFullScreen = this.onToggleFullScreen.bind(this);
    this.onSeekBarLayout = this.onSeekBarLayout.bind(this);
    this.onSeekGrant = this.onSeekGrant.bind(this);
    this.onSeekRelease = this.onSeekRelease.bind(this);
    this.onSeek = this.onSeek.bind(this);
    this.onSeekByPosition = this.onSeekByPosition.bind(this);
    this._collectStatistics = this._collectStatistics.bind(this);
    this.statisticsCall = this.statisticsCall.bind(this);
  }

  componentDidMount() {
    if (this.props.autoplay) {
      this.hideControls();
      this.props.stats && this.setState({ stats: true })
    }
  }

  componentWillUnmount() {
    this._deactivateStatistics()
    if (this.controlsTimeout) {
      clearTimeout(this.controlsTimeout);
      this.controlsTimeout = null;
    }
  }

  _deactivateStatistics () {
    stats.deactivate()
  }

  _collectStatistics () {
    stats.add(this.playerMode).activate()
  }

  statisticsCall () {
    if (!this.state.stats) return undefined

    const { isPlaying, isStarted } = this.state
    return isPlaying && isStarted || (isPlaying && this.wasPlayingBeforeSeek)
      ? this._collectStatistics()
      : this._deactivateStatistics()
  }

  onLayout(event) {
    const { width } = event.nativeEvent.layout;
    this.setState({
      width,
    });
  }

  onStartPress() {
    if (this.props.onStart) {
      this.props.onStart();
    }

    this.setState({
      isPlaying: true,
      isStarted: true,
    }, () => this.statisticsCall());

    this.hideControls();
  }

  onProgress(event) {
    if (this.state.isSeeking) {
      return;
    }
    if (this.props.onProgress) {
      this.props.onProgress(event);
    }

    const { duration } = this.props || this.state;
    if (duration) {
      this.setState({
        progress: event.currentTime / duration,
      });
    }
  }

  onEnd(event) {
    if (this.props.onEnd) {
      this.props.onEnd(event);
    }

    if (this.props.endWithThumbnail) {
      this.setState({ isStarted: false }, () => this.statisticsCall());
      this.player.dismissFullscreenPlayer();
    }

    this.setState({ progress: 1 });

    this.player.seek(0);
    if (!this.props.loop) {
      this.setState({
        isPlaying: false,
      }, () => this.statisticsCall());
    }
  }

  onLoad(event) {
    if (this.props.onLoad) {
      this.props.onLoad(event);
    }

    const { duration } = event;
    this.setState({ duration }, () => this.statisticsCall())
  }

  onPlayPress() {
    if (this.props.onPlayPress) {
      this.props.onPlayPress();
    }

    this.setState({
      isPlaying: !this.state.isPlaying,
    }, () => this.statisticsCall());
    this.showControls();
  }

  onMutePress() {
    this.setState({
      isMuted: !this.state.isMuted,
    });
    this.showControls();
  }

  onToggleFullScreen() {
    this.player.presentFullscreenPlayer();
  }

  onSeekBarLayout({ nativeEvent }) {
    const customStyle = this.props.customStyles.seekBar;
    let padding = 0;
    if (customStyle && customStyle.paddingHorizontal) {
      padding = customStyle.paddingHorizontal * 2;
    } else if (customStyle) {
      padding = customStyle.paddingLeft || 0;
      padding += customStyle.paddingRight ? customStyle.paddingRight : 0;
    } else {
      padding = 20;
    }

    this.seekBarWidth = nativeEvent.layout.width - padding;
  }

  onSeekStartResponder() {
    return true;
  }

  onSeekMoveResponder() {
    return true;
  }

  onSeekGrant(e) {
    this.seekTouchStart = e.nativeEvent.pageX;
    this.seekProgressStart = this.state.progress;
    this.wasPlayingBeforeSeek = this.state.isPlaying;
    this.setState({
      isSeeking: true,
      isPlaying: false,
    });
  }

  onSeekRelease() {
    this.setState({
      isSeeking: false,
      isPlaying: this.wasPlayingBeforeSeek,
    });
    this.showControls();
  }

  onSeekByPosition(position) {
    this.player.seek(position);

    this.wasPlayingBeforeSeek = this.state.isPlaying;
  }

  onSeek(e) {
    const diff = e.nativeEvent.pageX - this.seekTouchStart;
    const ratio = 100 / this.seekBarWidth;
    const progress = this.seekProgressStart + ((ratio * diff) / 100);

    this.setState({
      progress,
    });

    this.player.seek(progress * this.state.duration);
  }

  onPressReplay = event => {
    this.props.onPressReplay(event)
    this.hideControls()
  }

  onPressForward = event => {
    this.props.onPressForward(event)
    this.hideControls()
  }

  getSizeStyles() {
    const { videoWidth, videoHeight } = this.props;
    const { width } = this.state;
    const ratio = videoHeight / videoWidth;
    return {
      height: width * ratio,
      width,
    };
  }

  hideControls() {
    if (this.props.onHideControls) {
      this.props.onHideControls();
    }

    if (this.props.disableControlsAutoHide) {
      return;
    }

    if (this.controlsTimeout) {
      clearTimeout(this.controlsTimeout);
      this.controlsTimeout = null;
    }
    this.controlsTimeout = setTimeout(() => {
      this.setState({ isControlsVisible: false });
    }, this.props.controlsTimeout);
  }

  showControls() {
    if (this.props.onShowControls) {
      this.props.onShowControls();
    }

    this.setState({
      isControlsVisible: true,
    });
    this.hideControls();
  }

  renderStartButton() {
    const { customStyles } = this.props;
    return (
      <TouchableOpacity
        style={[styles.playButton, customStyles.playButton]}
        onPress={this.onStartPress}
      >
        <Icon style={[styles.playArrow, customStyles.playArrow]} name="play-arrow" size={42} />
      </TouchableOpacity>
    );
  }

  renderThumbnail() {
    const { thumbnail, style, customStyles, ...props } = this.props;
    return (
      <Image
      {...props}
      style={[
        styles.thumbnail,
        this.getSizeStyles(),
        style,
        customStyles.thumbnail,
      ]}
      source={thumbnail}
     >
      {this.renderStartButton()}
    </Image>
  );
  }

  renderSeekBar(fullWidth) {
    const { customStyles, disableSeek } = this.props;
    return (
      <View
        style={[
          styles.seekBar,
          fullWidth ? styles.seekBarFullWidth : {},
          customStyles.seekBar,
          fullWidth ? customStyles.seekBarFullWidth : {},
        ]}
        onLayout={this.onSeekBarLayout}
      >
      <View
        style={[
          { flexGrow: this.state.progress },
          styles.seekBarProgress,
          customStyles.seekBarProgress,
        ]}
    />
    {!fullWidth && !disableSeek ? (
      <View
        style={[
          styles.seekBarKnob,
          customStyles.seekBarKnob,
          this.state.isSeeking ? { transform: [{ scale: 1 }] } : {},
          this.state.isSeeking ? customStyles.seekBarKnobSeeking : {},
        ]}
      hitSlop={{ top: 20, bottom: 20, left: 10, right: 20 }}
      onStartShouldSetResponder={this.onSeekStartResponder}
      onMoveShouldSetPanResponder={this.onSeekMoveResponder}
      onResponderGrant={this.onSeekGrant}
      onResponderMove={this.onSeek}
      onResponderRelease={this.onSeekRelease}
      onResponderTerminate={this.onSeekRelease}
      />
    ) : null}
      {/* <View style={[
      styles.seekBarBackground,
      { flexGrow: 1 - this.state.progress },
      customStyles.seekBarBackground,
    ]} /> */}
    </View>
    );
  }

  renderControls() {
    const { customStyles, liveRewind, rewindParams } = this.props;
    const isHLS = this.playerMode === 'TV'

    const playLeft = this.getSizeStyles().width / 2 - (isTablet ? 45 : 30)
    const playIconSize = isTablet ? 80 : 52
    const rewindIconSize = isTablet ? 35 : 22
    const rewindRight = this.getSizeStyles().width / 2 - playIconSize - rewindIconSize / 2 - 5
    const rewindLeft = (this.getSizeStyles().width - playIconSize)  / 2 - rewindIconSize * 1.5

    return (
      <View style={[styles.controls, customStyles.controls, !isTablet ? { marginTop: -60 } : {} ]}>
        {isHLS ?
          <View style={[customStyles.controlButton, { flexDirection: 'row', marginTop: 5 }]}>
            <Icon
              style={[styles.extraControl, customStyles.controlIcon, { color: 'red' }]}
              name={'fiber-manual-record'}
              color='#FF0000'
              size={18}
            />
            <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 12, marginTop: 10}}>LIVE</Text>
          </View>
          : <View style={[customStyles.controlButton, { margin: 30 }]} />}

        {isHLS
          ? <>
            <View style={{ flexDirection: 'row', position: 'absolute', top: -this.getSizeStyles().height / 2 + 50, left: 0, alignItems: 'center' }}>
              <Icon name={'chevron-left'} color={'white'} size={32}/>
              <Text style={{ color: 'white', fontFamily: 'IBMPlexSansCond', fontSize: 12, marginLeft: -5 }} >swipe</Text>

            </View>
            {
              liveRewind
                ? <>
                  <View style={{ flexDirection: 'row', position: 'absolute', top: -this.getSizeStyles().height / 2 + (isTablet ? 20 : 30), left: rewindLeft - 10, alignItems: 'center' }}>
                    { rewindParams.rewindTimeBack ? <Text style={{ color: 'white', fontFamily: 'IBMPlexSansCond', fontSize: 12 }}>{`${rewindParams.rewindTimeBack} sec`}</Text> : null }
                  </View>
                  <TouchableOpacity style={{ flexDirection: 'row', position: 'absolute', top: -this.getSizeStyles().height / 2 + (isTablet ? 48 : 55), left: rewindLeft, alignItems: 'center' }} onPress={this.onPressReplay}>
                    <IconFA name='undo-alt' size={rewindIconSize} color={'white'} type='regular' />
                  </TouchableOpacity>

                  <View style={{ flexDirection: 'row', position: 'absolute', top: -this.getSizeStyles().height / 2 + (isTablet ? 20 : 30), right: rewindRight - 20, alignItems: 'center' }}>
                    { rewindParams.rewindTimeForth ? <Text style={{ color: 'white', fontFamily: 'IBMPlexSansCond', fontSize: 12 }}>{`+${rewindParams.rewindTimeForth} sec`}</Text> : null }
                  </View>
                  <TouchableOpacity style={{ flexDirection: 'row', position: 'absolute', top: -this.getSizeStyles().height / 2 + (isTablet ? 48 : 55), right: rewindRight, alignItems: 'center' }} onPress={this.props.onPressForward}>
                    <IconFA style={{ alignSelf: 'center' }} name='redo-alt' size={rewindIconSize} color={'white'} type='regular' />
                  </TouchableOpacity>
                </>
                : null
            }
            <View style={{ flexDirection: 'row', position: 'absolute', top: -this.getSizeStyles().height / 2 + 50, right: 0, alignItems: 'center' }}>
              <Text style={{ color: 'white', fontFamily: 'IBMPlexSansCond', fontSize: 12, marginRight: -5 }} >swipe</Text>
              <Icon name={'chevron-right'} color={'white'} size={32}/>
            </View>
          </>
          : <>
            <View style={{ flexDirection: 'row', position: 'absolute', top: -this.getSizeStyles().height / 2 + 50, left: 50, alignItems: 'center'}}>
              <TouchableOpacity onPress={() => this.props.onSkipVideo('prev')}>
                <Icon name={'skip-previous'} color={'white'} size={32} style={{ paddingHorizontal: 20 }} />
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', position: 'absolute', top: -this.getSizeStyles().height / 2 + 50, right: 50, alignItems: 'center'}}>
              <TouchableOpacity onPress={() => this.props.onSkipVideo('next')}>
                <Icon name={'skip-next'} color={'white'} size={32} style={{ paddingHorizontal: 20 }} />
              </TouchableOpacity>
            </View>
          </>}


        <TouchableOpacity
          onPress={this.onPlayPress}
          style={[customStyles.controlButton, customStyles.playControl,
            {
              position: 'absolute',
              top: -this.getSizeStyles().height / 2 + (isTablet ? 15 : 30),
              left: playLeft }
          ]}
        >
          <Icon
            style={[styles.playControl, customStyles.controlIcon, customStyles.playIcon]}
            name={this.state.isPlaying ? 'pause' : 'play-arrow'}
            size={playIconSize}
          />

        </TouchableOpacity>
        {this.renderSeekBar()}

        {/* <View style={[customStyles.controlButton, { flexDirection: 'row', marginTop: 5 }]}>
            <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 12, marginTop: 10}}>{this.state.duration}</Text>
          </View> */}

        {this.props.muted ? null : (
          <TouchableOpacity onPress={this.onMutePress} style={customStyles.controlButton}>
            <Icon
              style={[styles.extraControl, customStyles.controlIcon, isTablet ? { marginTop: 4 } : {}]}
              name={this.state.isMuted ? 'volume-off' : 'volume-up'}
              size={24}
            />
          </TouchableOpacity>
        )}

        {(Platform.OS === 'android' || this.props.disableFullscreen) ? null : (
          <TouchableOpacity onPress={this.onToggleFullScreen} style={customStyles.controlButton}>
            <Icon
              style={[styles.extraControl, customStyles.controlIcon]}
              name="fullscreen"
              size={32}
            />
          </TouchableOpacity>
        )}
      </View>
    );
  }

  renderVideo() {
    const {
      video,
      style,
      resizeMode,
      pauseOnPress,
      fullScreenOnLongPress,
      customStyles,
      ...props
    } = this.props;

    return (
      <View style={customStyles.videoWrapper}>
        <Video
          {...props}
          style={[
            styles.video,
            this.getSizeStyles(),
            style,
            customStyles.video,
          ]}
          ref={p => { this.player = p; }}
          muted={this.props.muted || this.state.isMuted}
          paused={!this.state.isPlaying}
          onProgress={this.onProgress}
          onEnd={this.onEnd}
          onLoad={this.onLoad}
          source={video}
          resizeMode={resizeMode}
          textTracks={[]}
        />
        <View
          style={[
            this.getSizeStyles(),
            { marginTop: -this.getSizeStyles().height },
          ]}
        >
          <TouchableOpacity
            style={styles.overlayButton}
            onPress={() => {
              this.showControls();
              if (pauseOnPress)
                this.onPlayPress();
            }}
            onLongPress={() => {
              if (fullScreenOnLongPress && Platform.OS !== 'android')
                this.onToggleFullScreen();
            }}
          />
        </View>
        {((!this.state.isPlaying) || this.state.isControlsVisible)
          ? this.renderControls()
          : null}
        {/* : this.renderSeekBar(true)} */}
      </View>
    );
  }

  renderContent() {
    const { thumbnail, style } = this.props;
    const { isStarted } = this.state;

    if (!isStarted && thumbnail) {
      return this.renderThumbnail();
    } else if (!isStarted) {
      return (
        <View style={[styles.preloadingPlaceholder, this.getSizeStyles(), style]}>
          {this.renderStartButton()}
        </View>
      );
    }
    return this.renderVideo();
  }

  render() {
    return (
      <View onLayout={this.onLayout} style={this.props.customStyles.wrapper}>
        {this.renderContent()}
      </View>
    );
  }
}

VideoPlayer.propTypes = {
  video: Video.propTypes.source,
  thumbnail: Image.propTypes.source,
  videoWidth: PropTypes.number,
  videoHeight: PropTypes.number,
  duration: PropTypes.number,
  autoplay: PropTypes.bool,
  defaultMuted: PropTypes.bool,
  muted: PropTypes.bool,
  style: ViewPropTypes.style,
  controlsTimeout: PropTypes.number,
  disableControlsAutoHide: PropTypes.bool,
  disableFullscreen: PropTypes.bool,
  loop: PropTypes.bool,
  resizeMode: Video.propTypes.resizeMode,
  hideControlsOnStart: PropTypes.bool,
  endWithThumbnail: PropTypes.bool,
  disableSeek: PropTypes.bool,
  pauseOnPress: PropTypes.bool,
  fullScreenOnLongPress: PropTypes.bool,
  customStyles: PropTypes.shape({
    wrapper: ViewPropTypes.style,
    video: Video.propTypes.style,
    videoWrapper: ViewPropTypes.style,
    controls: ViewPropTypes.style,
    playControl: TouchableOpacity.propTypes.style,
    controlButton: TouchableOpacity.propTypes.style,
    controlIcon: Icon.propTypes.style,
    playIcon: Icon.propTypes.style,
    seekBar: ViewPropTypes.style,
    seekBarFullWidth: ViewPropTypes.style,
    seekBarProgress: ViewPropTypes.style,
    seekBarKnob: ViewPropTypes.style,
    seekBarKnobSeeking: ViewPropTypes.style,
    seekBarBackground: ViewPropTypes.style,
    thumbnail: Image.propTypes.style,
    playButton: TouchableOpacity.propTypes.style,
    playArrow: Icon.propTypes.style,
  }),
  onEnd: PropTypes.func,
  onProgress: PropTypes.func,
  onLoad: PropTypes.func,
  onStart: PropTypes.func,
  onPlayPress: PropTypes.func,
  onHideControls: PropTypes.func,
  onShowControls: PropTypes.func,
};

VideoPlayer.defaultProps = {
  videoWidth: 1280,
  videoHeight: 720,
  autoplay: false,
  controlsTimeout: 2000,
  loop: false,
  resizeMode: 'contain',
  disableSeek: false,
  pauseOnPress: false,
  fullScreenOnLongPress: false,
  customStyles: {},
};
