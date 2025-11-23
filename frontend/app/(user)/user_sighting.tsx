import { ResizeMode, Video } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, FlatList, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { apiToggleSightingLike } from '../../api/like';
import { apiAdminDeleteSighting } from '../../api/sighting';
import { Colors } from '../../constants/Colors';
import { FeedScreenStyles } from '../../constants/FeedStyles';
import { useAuth } from '../../context/AuthContext';

// Define the Sighting type again here so the component is self-contained
type Sighting = {
    _id: string;
    caption: string;
    createdAt: string;
    mediaUrls: string[];
    userName?: string;
    userProfilePictureUrl?: string;
    likes?: number;
};

const ITEM_HEIGHT = 400;

const { width } = Dimensions.get('window');


export default function UserSightingScreen() {
    const router = useRouter();
    const { token, user } = useAuth();
    const [menuVisible, setMenuVisible] = useState(false);
    const [selectedSighting, setSelectedSighting] = useState<Sighting | null>(null);
    const [carouselIndex, setCarouselIndex] = useState<Record<string, number>>({});
    const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
    const [likesCountMap, setLikesCountMap] = useState<Record<string, number>>({});
    const scaleMapRef = useRef<Record<string, Animated.Value>>({});
    // Track visibility of items to control autoplay
    const [visibleMap, setVisibleMap] = useState<Record<string, boolean>>({});
    const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 60 }).current;
    const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: any[] }) => {
        const next: Record<string, boolean> = {};
        for (const it of viewableItems) {
            const id = it?.item?._id;
            if (id) next[id] = true;
        }
        setVisibleMap(next);
    });

    const getScale = (id: string) => {
        if (!scaleMapRef.current[id]) {
            scaleMapRef.current[id] = new Animated.Value(1);
        }
        return scaleMapRef.current[id];
    };

    const pulseHeart = (id: string) => {
        const scale = getScale(id);
        Animated.sequence([
            Animated.timing(scale, { toValue: 1.2, duration: 120, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
            Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true }),
        ]).start();
    };
    // Get the new 'initialIndex' parameter
    const { sightings: sightingsJson, initialIndex, isOwner: isOwnerParam } = useLocalSearchParams<{ sightings: string; initialIndex: string; isOwner?: string }>();

    // Create a ref for the FlatList
    const flatListRef = useRef<FlatList<Sighting>>(null);

    // Parse the JSON string back into an array. No reordering is needed.
    const allSightings: Sighting[] = sightingsJson ? JSON.parse(sightingsJson) : [];
    console.log('User Sighting Screen - Total sightings:', allSightings.length);
    console.log('User Sighting Screen - First sighting:', allSightings[0]);
    
    const [list, setList] = useState<Sighting[]>(allSightings);
    useEffect(() => { setList(allSightings); }, [sightingsJson]);
    const isOwnerView = String(isOwnerParam || '') === 'true';

    // This effect runs once after the component mounts
    useEffect(() => {
        if (initialIndex) {
            const index = parseInt(initialIndex, 10);
            // Use a short timeout to ensure the FlatList has rendered its items
            // before we try to scroll.
            setTimeout(() => {
                flatListRef.current?.scrollToIndex({
                    index,
                    animated: true,
                    viewPosition: 0.5, // 0.5 centers the item, 0 puts it at the top
                });
            }, 100);
        }
    }, [initialIndex]);

    const handleMenuOpen = (item: Sighting) => {
        setSelectedSighting(item);
        setMenuVisible(true);
    };

    const handleMenuClose = () => {
        setMenuVisible(false);
        setSelectedSighting(null);
    };

    const handleDeleteSelected = async () => {
        if (!selectedSighting?._id) return;
        if (!token || token === 'local-admin-fake-token') {
            alert('Please log in to delete your post.');
            return;
        }
        try {
            await apiAdminDeleteSighting(token, selectedSighting._id);
            setList(prev => prev.filter(s => s._id !== selectedSighting._id));
            handleMenuClose();
        } catch (e) {
            console.error('Failed to delete sighting', e);
            alert('Could not delete this post.');
        }
    };

    function getRelativeTime(dateString: string) {
        const now = new Date();
        const posted = new Date(dateString);
        const diffMs = now.getTime() - posted.getTime();

        // Calculate the difference in various units
        const diffSeconds = Math.floor(diffMs / 1000);
        const diffMinutes = Math.floor(diffSeconds / 60);
        const diffHours = Math.floor(diffMinutes / 60);
        const diffDays = Math.floor(diffHours / 24);

        // If the difference is 7 days or more, show the date
        if (diffDays >= 7) {
            // Formats the date to "Month Day", e.g., "Sep 24"
            const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
            return new Intl.DateTimeFormat('en-US', options).format(posted);
        }

        // Return days if it's between 1 and 6
        if (diffDays > 0) {
            return `${diffDays}d ago`;
        }
        // Return hours if less than a day
        if (diffHours > 0) {
            return `${diffHours}h ago`;
        }
        // Return minutes if less than an hour
        if (diffMinutes > 0) {
            return `${diffMinutes}m ago`;
        }
        // Return seconds if less than a minute
        if (diffSeconds > 0) {
            return `${diffSeconds}s ago`;
        }

        return 'just now';
    }

    const renderImages = (mediaUrls: string[], sightingId: string) => {
        console.log(`Rendering images for sighting ${sightingId}:`, mediaUrls);
        if (!mediaUrls || mediaUrls.length === 0) {
            console.log('No media URLs found');
            return (
                <View style={{ backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center', height: 400 }}>
                    <Text style={{ color: '#999', fontSize: 16 }}>No media available</Text>
                </View>
            );
        }
        const isVideoUrl = (url: string) => /\.(mp4|mov|m4v|webm)$/i.test(url) || /\/video\/upload\//i.test(url);
        const derivePoster = (url: string): string | undefined => {
            try {
                if (!/res\.cloudinary\.com/i.test(url) || !/\/video\/upload\//i.test(url)) return undefined;
                const qIndex = url.indexOf('?');
                const clean = qIndex >= 0 ? url.slice(0, qIndex) : url;
                const dot = clean.lastIndexOf('.');
                const base = dot >= 0 ? clean.slice(0, dot) : clean;
                const transformed = base.replace('/video/upload/', '/video/upload/so_1/');
                return `${transformed}.jpg`;
            } catch { return undefined; }
        };
        const VideoComponent: any = Video as any;
        const isVisible = !!visibleMap[sightingId];
        if (mediaUrls.length === 1) {
            const url = mediaUrls[0];
            console.log(`Single media - URL: ${url}, isVideo: ${isVideoUrl(url)}`);
            return (
                <View style={{ height: 400, width: '100%', backgroundColor: '#f3f4f6' }}>
                    {isVideoUrl(url) ? (
                        <VideoComponent
                            source={{ uri: url }}
                            style={{ width: '100%', height: 400 }}
                            resizeMode={ResizeMode.CONTAIN}
                            useNativeControls
                            shouldPlay={isVisible}
                            isLooping
                            isMuted
                            {...(() => { const p = derivePoster(url); return p ? { usePoster: true, posterSource: { uri: p } } : {}; })()}
                        />
                    ) : (
                        <Image
                            source={{ uri: url }}
                            style={{ width: '100%', height: 400 }}
                            resizeMode="contain"
                            onError={(e) => console.log('Image load error:', e.nativeEvent.error, 'URL:', url)}
                            onLoad={() => console.log('Image loaded successfully:', url)}
                        />
                    )}
                </View>
            );
        }
        // Carousel for multiple images
        return (
            <View style={{ height: 400, width: '100%', backgroundColor: '#f3f4f6' }}>
                <ScrollView
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onScroll={e => {
                        const index = Math.round(e.nativeEvent.contentOffset.x / width);
                        setCarouselIndex(prev => ({ ...prev, [sightingId]: index }));
                    }}
                    scrollEventThrottle={16}
                >
                    {mediaUrls.map((url, idx) => (
                        isVideoUrl(url) ? (
                            <VideoComponent
                                key={idx}
                                source={{ uri: url }}
                                style={{ width, height: 400 }}
                                resizeMode={ResizeMode.CONTAIN}
                                useNativeControls
                                shouldPlay={isVisible && (carouselIndex[sightingId] === idx)}
                                isLooping
                                isMuted
                                {...(() => { const p = derivePoster(url); return p ? { usePoster: true, posterSource: { uri: p } } : {}; })()}
                            />
                        ) : (
                            <Image
                                key={idx}
                                source={{ uri: url }}
                                style={{ width, height: 400 }}
                                resizeMode="contain"
                                onError={(e) => console.log(`Carousel image ${idx} load error:`, e.nativeEvent.error, 'URL:', url)}
                                onLoad={() => console.log(`Carousel image ${idx} loaded:`, url)}
                            />
                        )
                    ))}
                </ScrollView>
            </View>
        );
    };

    // This function renders each post with its caption and date
    const renderSightingPost = ({ item }: { item: Sighting }) => {
        console.log('Rendering sighting post:', { id: item._id, mediaUrls: item.mediaUrls, caption: item.caption });
        return (
        <View style={FeedScreenStyles.card}>
            <View style={FeedScreenStyles.cardHeader}>
                <View style={FeedScreenStyles.headerLeft}>
                    <LinearGradient
                        colors={[Colors.light.primaryGreen, Colors.light.secondaryGreen]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={FeedScreenStyles.avatarRing}
                    >
                        <View style={FeedScreenStyles.avatar}>
                            {item.userProfilePictureUrl ? (
                                <Image
                                    source={{ uri: item.userProfilePictureUrl }}
                                    style={{ width: 44, height: 44, borderRadius: 22 }}
                                />
                            ) : (
                                <Text style={FeedScreenStyles.avatarText}>
                                    {(item.userName || 'U').charAt(0).toUpperCase()}
                                </Text>
                            )}
                        </View>
                    </LinearGradient>
                    <View style={FeedScreenStyles.userInfo}>
                        <Text style={FeedScreenStyles.username}>{item.userName || 'Unknown'}</Text>
                        <Text style={FeedScreenStyles.time}>{getRelativeTime(item.createdAt)}</Text>
                    </View>
                </View>
                <TouchableOpacity
                    onPress={() => handleMenuOpen(item)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={FeedScreenStyles.menuButton}
                    activeOpacity={0.7}
                >
                    <Icon name="ellipsis-h" size={20} color="#6b7280" />
                </TouchableOpacity>
            </View>
            {renderImages(item.mediaUrls, item._id)}
            {/* Carousel indicators */}
            {item.mediaUrls && item.mediaUrls.length > 1 && (
                <View style={FeedScreenStyles.carouselIndicators}>
                    {item.mediaUrls.map((_, idx) => (
                        <View
                            key={idx}
                            style={[
                                FeedScreenStyles.carouselDot,
                                carouselIndex[item._id] === idx && FeedScreenStyles.carouselDotActive,
                            ]}
                        />
                    ))}
                </View>
            )}
            <View style={FeedScreenStyles.cardContent}>
                <View style={FeedScreenStyles.captionRow}>
                    <Text style={FeedScreenStyles.cardCaption}>{item.caption}</Text>
                </View>
                <View style={FeedScreenStyles.cardActions}>
                    <View style={{ flexDirection: 'row', gap: 16 }}>
                        <View style={FeedScreenStyles.actionGroup}>
                            <TouchableOpacity
                                style={FeedScreenStyles.cardActionBtn}
                                onPress={() => handleToggleLike(item)}
                                activeOpacity={0.8}
                            >
                                <Animated.View style={{ transform: [{ scale: getScale(item._id) }] }}>
                                    <Icon
                                        name={likedMap[item._id] ? 'heart' : 'heart-o'}
                                        size={24}
                                        color={likedMap[item._id] ? '#e0245e' : '#6b7280'}
                                    />
                                </Animated.View>
                            </TouchableOpacity>
                            <Text style={FeedScreenStyles.actionText}>{likesCountMap[item._id] ?? Number(item.likes ?? 0)}</Text>
                        </View>
                        <View style={FeedScreenStyles.actionGroup}>
                            <TouchableOpacity style={FeedScreenStyles.cardActionBtn}>
                                <Icon name="comment-o" size={24} color="#6b7280" />
                            </TouchableOpacity>
                            <Text style={FeedScreenStyles.actionText}>0</Text>
                        </View>
                    </View>
                    <TouchableOpacity style={FeedScreenStyles.cardActionBtn}>
                        <Icon name="share" size={24} color="#6b7280" />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
        );
    };

    const handleToggleLike = async (item: any) => {
        const sightingId = item._id;
        if (!sightingId) return;
        if (!token || token === 'local-admin-fake-token') {
            alert('Please log in to like posts.');
            return;
        }
        const currentlyLiked = !!likedMap[sightingId];
        setLikedMap(prev => ({ ...prev, [sightingId]: !currentlyLiked }));
        // update count optimistically within the array data we passed in; since it's local state, mutate via set
        // allSightings is constant; we rely on FlatList item reference, so best to manage a separate state if needed
        // update count optimistically
        setLikesCountMap(prev => ({
            ...prev,
            [sightingId]: Math.max(0, (prev[sightingId] ?? Number(item.likes ?? 0)) + (currentlyLiked ? -1 : 1))
        }));
        try {
            const resp = await apiToggleSightingLike(token, sightingId);
            const serverLiked = !!resp?.data?.liked;
            if (serverLiked !== !currentlyLiked) {
                setLikedMap(prev => ({ ...prev, [sightingId]: serverLiked }));
                setLikesCountMap(prev => ({
                    ...prev,
                    [sightingId]: Math.max(0, (prev[sightingId] ?? Number(item.likes ?? 0)) + (serverLiked ? 1 : -1))
                }));
            }
        } catch (e) {
            setLikedMap(prev => ({ ...prev, [sightingId]: currentlyLiked }));
            setLikesCountMap(prev => ({
                ...prev,
                [sightingId]: Math.max(0, (prev[sightingId] ?? Number(item.likes ?? 0)) + (currentlyLiked ? 1 : -1))
            }));
            console.error('Failed to toggle like', e);
        }
        pulseHeart(sightingId);
    };

    // This optimization helps FlatList scroll smoothly to any item without
    // needing to render all the items in between.
    const getItemLayout = (data: Sighting[] | null | undefined, index: number) => ({
        length: ITEM_HEIGHT,
        offset: ITEM_HEIGHT * index,
        index,
    });

    return (
        <View style={FeedScreenStyles.container}>
            {/* Header */}
            <LinearGradient
                colors={[Colors.light.background, Colors.light.softBeige]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.header}
            >
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <Icon name="arrow-left" size={24} color={Colors.light.primaryGreen} />
                </Pressable>
                <Text style={styles.headerTitle}>Sightings</Text>
                <View style={styles.headerRight} />
            </LinearGradient>

            <FlatList
                ref={flatListRef} // Attach the ref here
                data={list}
                renderItem={renderSightingPost}
                keyExtractor={(item) => item._id}
                getItemLayout={getItemLayout} // Add the performance optimization
                onViewableItemsChanged={onViewableItemsChanged.current}
                viewabilityConfig={viewabilityConfig}
                
            />

            {/* Popup menu modal */}
                  <Modal
                    visible={menuVisible}
                    transparent
                    animationType="fade"
                    onRequestClose={handleMenuClose}
                  >
                    <View style={FeedScreenStyles.menuOverlay}>
                      <TouchableOpacity
                        style={StyleSheet.absoluteFillObject as any}
                        activeOpacity={1}
                        onPress={handleMenuClose}
                      />
                      <View style={FeedScreenStyles.menuContainer}>
                                                {(() => {
                                                    // selectedSighting in this screen doesn't include 'user' in the narrowed type; fall back to owner by username match
                                                    const ownerId = (selectedSighting as any)?.user?._id || (selectedSighting as any)?.user || null;
                                                    const isSelectedOwner = ownerId && user?._id && String(ownerId) === String(user._id);
                                                    const canDelete = isOwnerView || !!isSelectedOwner;
                          return canDelete ? (
                          <TouchableOpacity style={FeedScreenStyles.menuItem} onPress={handleDeleteSelected}>
                            <Text style={[FeedScreenStyles.menuText, { color: '#f55' }]}>Delete</Text>
                          </TouchableOpacity>
                          ) : null;
                        })()}
                        <TouchableOpacity style={FeedScreenStyles.menuItem}>
                          <Text style={FeedScreenStyles.menuText}>Share</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={FeedScreenStyles.menuItem} onPress={handleMenuClose}>
                          <Text style={FeedScreenStyles.menuText}>Cancel</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 60,
        paddingBottom: 16,
        shadowColor: Colors.light.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 3,
    },
    backButton: {
        padding: 8,
        marginRight: 8,
    },
    headerTitle: {
        flex: 1,
        fontSize: 24,
        fontWeight: '700',
        color: Colors.light.mainText,
    },
    headerRight: {
        width: 40,
    },
});
