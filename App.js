import React, { useState, useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  Image,
  Animated,
  Dimensions,
  Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { IcyMetadataParser } from './services/IcyMetadataParser';

const { width } = Dimensions.get('window');

export default function App() {
  const insets = useSafeAreaInsets();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sound, setSound] = useState(null);
  const [metadata, setMetadata] = useState('');
  const [textWidth, setTextWidth] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const [separatorWidth, setSeparatorWidth] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const beatAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const marqueeAnim = useRef(new Animated.Value(0)).current;
  const metadataInterval = useRef(null);

  useEffect(() => {
    setupAudio();
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
      if (metadataInterval.current) {
        clearInterval(metadataInterval.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isPlaying) {
      startPulseAnimation();
      startBeatAnimation();
      startRotateAnimation();
    } else {
      pulseAnim.setValue(1);
      beatAnim.setValue(1);
      rotateAnim.setValue(0);
      marqueeAnim.stopAnimation();
      marqueeAnim.setValue(0);
    }
  }, [isPlaying]);

  useEffect(() => {
    marqueeAnim.stopAnimation();
    marqueeAnim.setValue(0);

    const needsScroll = isPlaying && metadata && textWidth > 0 && containerWidth > 0;
    setIsScrolling(needsScroll);

    if (needsScroll) {
      const gap = Math.max(separatorWidth, 6); // tighter gap based on separator
      const distance = textWidth + gap;
      const duration = Math.max(8000, distance * 18);

      marqueeAnim.setValue(0);

      Animated.loop(
        Animated.timing(marqueeAnim, {
          toValue: -distance,
          duration,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    }
  }, [metadata, textWidth, containerWidth, isPlaying, separatorWidth]);

  const setupAudio = async () => {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
      interruptionModeIOS: 2, // Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX
      interruptionModeAndroid: 1, // Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX
    });
  };

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 650,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 650,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const startBeatAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(beatAnim, {
          toValue: 1.25,
          duration: 400,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(beatAnim, {
          toValue: 1,
          duration: 400,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const startRotateAnimation = () => {
    rotateAnim.setValue(0);
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 10000,
        useNativeDriver: true,
      })
    ).start();
  };

  const fetchMetadata = async () => {
    console.log('fetchMetadata called');
    try {
      console.log('Fetching ICY metadata from stream...');
      
      const metadata = await IcyMetadataParser.fetchStreamMetadata(
        'http://server.radiostreaming.com.ar:8308/stream.mp3'
      );

      console.log('ICY Metadata received:', metadata);

      if (!metadata) {
        setMetadata('En Vivo');
        return;
      }

      let metaText = '';
      
      // Priority: Song title > Genre + bitrate
      if (metadata.title || metadata.artist) {
        if (metadata.artist && metadata.title && metadata.artist !== metadata.title) {
          metaText = `${metadata.artist} - ${metadata.title}`;
        } else {
          metaText = metadata.title || metadata.artist;
        }
      } else if (metadata.genre) {
        metaText = metadata.genre.charAt(0).toUpperCase() + metadata.genre.slice(1);
        if (metadata.bitrate) {
          metaText += ` • ${metadata.bitrate}kbps`;
        }
      } else if (metadata.station) {
        metaText = metadata.station;
      } else {
        metaText = 'En Vivo';
      }
      
      const cleanMeta = metaText
        .replaceAll("[", "")
        .replaceAll("YouTube", "")
        .replaceAll("  ", " ")
        .replaceAll(".mp3", "")
        .replaceAll("]", "")
        .trim();
        
      console.log('Setting metadata to:', cleanMeta);
      setMetadata(cleanMeta);
    } catch (error) {
      console.log('Error fetching metadata:', error.message || error);
      setMetadata('En Vivo');
    }
  };

  const playRadio = async () => {
    try {
      setIsLoading(true);
      
      if (sound) {
        await sound.unloadAsync();
      }

      console.log('Creating audio stream...');
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: 'http://server.radiostreaming.com.ar:8308/stream.mp3' },
        { 
          shouldPlay: true, 
          isLooping: false,
          progressUpdateIntervalMillis: 5000,
        },
        onPlaybackStatusUpdate
      );

      setSound(newSound);
      setIsPlaying(true);
      setIsLoading(false);
      
      // Fetch metadata immediately and then every 10 seconds
      console.log('Starting metadata fetch...');
      fetchMetadata();
      metadataInterval.current = setInterval(fetchMetadata, 10000);
    } catch (error) {
      console.error('Error playing radio:', error);
      setIsLoading(false);
      setIsPlaying(false);
    }
  };

  const stopRadio = async () => {
    if (sound) {
      await sound.stopAsync();
      await sound.unloadAsync();
      setSound(null);
    }
    if (metadataInterval.current) {
      clearInterval(metadataInterval.current);
      metadataInterval.current = null;
    }
    setIsPlaying(false);
    setMetadata('');
  };

  const onPlaybackStatusUpdate = (status) => {
    if (status.didJustFinish) {
      setIsPlaying(false);
    }
  };

  const togglePlayback = () => {
    if (isPlaying) {
      stopRadio();
    } else {
      playRadio();
    }
  };

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <LinearGradient
      colors={['#623f97ff', '#9e547fff', '#ECA776']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <StatusBar style="light" />
      
      <View style={styles.header}>
        <Text style={styles.headerText}>RADIO ONLINE</Text>
      </View>

      <View style={styles.content}>
        <Animated.View 
          style={[
            styles.coverContainer,
            { 
              transform: [
                { scale: pulseAnim },
                { rotate: spin }
              ] 
            }
          ]}
        >
          <View style={styles.coverWrapper}>
            <Animated.Image
              source={require('./assets/cover.png')}
              style={[
                styles.coverImage,
                isPlaying && { transform: [{ scale: beatAnim }] }
              ]}
              resizeMode="cover"
            />
          </View>
        </Animated.View>

        <Text style={styles.stationName}>Christian International</Text>
        {/* <Text style={styles.stationSubtitle}>Radio</Text> */}

        {isPlaying && (
          <View style={styles.statusContainer}>
            <View style={styles.liveIndicator} />
            <Text style={styles.liveText}>EN VIVO</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.playButton, isLoading && styles.playButtonDisabled]}
          onPress={togglePlayback}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={isPlaying ? ['#E07B39', '#F4A261'] : ['#fff', '#f0f0f0']}
            style={styles.playButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {isLoading ? (
              <Ionicons 
                name="reload" 
                size={50} 
                color={isPlaying ? '#fff' : '#9B5DE5'} 
              />
            ) : (
              <Ionicons 
                name={isPlaying ? 'pause' : 'play'} 
                size={50} 
                color={isPlaying ? '#fff' : '#9B5DE5'}
                style={{ marginLeft: isPlaying ? 0 : 5 }}
              />
            )}
          </LinearGradient>
        </TouchableOpacity>

        <Text style={styles.hint}>
          {isPlaying ? '' : 'Toca para reproducir'}
        </Text>
      </View>

      <View style={[
        styles.footer,
        { marginBottom: Math.max(insets.bottom, 12) }
      ]}>
        <Ionicons name="musical-notes" size={20} color="rgba(255,255,255,0.6)" />
        {!isPlaying && (<Text style={styles.footerText}>Transmisión de alta calidad</Text>)}
        {isPlaying && (
          <View
            style={styles.footerMarqueeContainer}
            onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
          >
            <Animated.View
              style={[
                isScrolling && {
                  transform: [
                    { translateX: marqueeAnim },
                  ],
                },
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text
                  style={styles.footerText}
                  onLayout={(e) => setTextWidth(e.nativeEvent.layout.width)}
                  numberOfLines={1}
                  ellipsizeMode="clip"
                >
                  {metadata || 'Cargando información...'}
                </Text>
                <Text
                  style={styles.footerSeparator}
                  onLayout={(e) => setSeparatorWidth(e.nativeEvent.layout.width)}
                >
                  {' \u2022 '}
                </Text>
                <Text
                  style={styles.footerText}
                  numberOfLines={1}
                  ellipsizeMode="clip"
                >
                  {metadata || 'Cargando información...'}
                </Text>
                <Text style={styles.footerSeparator}>{' \u2022 '}</Text>
                <Text
                  style={styles.footerText}
                  numberOfLines={1}
                  ellipsizeMode="clip"
                >
                  {metadata || 'Cargando información...'}
                </Text>
                <Text style={styles.footerSeparator}>{' \u2022 '}</Text>
                <Text
                  style={styles.footerText}
                  numberOfLines={1}
                  ellipsizeMode="clip"
                >
                  {metadata || 'Cargando información...'}
                </Text>
              </View>
            </Animated.View>
          </View>
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    alignItems: 'center',
  },
  headerText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 3,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  coverContainer: {
    marginBottom: 40,
  },
  coverWrapper: {
    width: width * 0.65,
    height: width * 0.65,
    borderRadius: width * 0.325,
    overflow: 'visible',
    borderWidth: 8,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 22,
    elevation: 18,
  },
  coverImage: {
    width: '100%',
    height: '100%',
    borderRadius: width * 0.325,
  },
  playingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  waveContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  stationName: {
    fontSize: 36,
    fontWeight: '900',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 5,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  stationSubtitle: {
    fontSize: 24,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 25,
    marginBottom: 15,
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#FF3B30',
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  liveIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
    marginRight: 10,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  liveText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  playButton: {
    marginTop: 20,
    marginBottom: 15,
  },
  playButtonDisabled: {
    opacity: 0.7,
  },
  playButtonGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  hint: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 10,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 40,
    paddingHorizontal: 16,
    width: '100%',
    gap: 8,
  },
  footerMarqueeContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  footerText: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  footerSeparator: {
    fontSize: 22,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '700',
    marginHorizontal: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
