import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, FlatList, Image, Pressable, TouchableOpacity, ScrollView, Dimensions, Modal } from 'react-native';
import { FeedScreenStyles } from '../../constants/FeedStyles';
import Icon from 'react-native-vector-icons/FontAwesome';
import { Colors } from '../../constants/Colors';

// Define the Sighting type again here so the component is self-contained
type Sighting = {
    _id: string;
    caption: string;
    createdAt: string;
    mediaUrls: string[];
};

const ITEM_HEIGHT = 400;

const { width } = Dimensions.get('window');


export default function UserSightingScreen() {
    const router = useRouter();
    const [menuVisible, setMenuVisible] = useState(false);
    const [selectedSighting, setSelectedSighting] = useState(null);
    const [carouselIndex, setCarouselIndex] = useState({});
    // Get the new 'initialIndex' parameter
    const { sightings: sightingsJson, initialIndex } = useLocalSearchParams<{ sightings: string; initialIndex: string }>();

    // Create a ref for the FlatList
    const flatListRef = useRef<FlatList<Sighting>>(null);

    // Parse the JSON string back into an array. No reordering is needed.
    const allSightings: Sighting[] = sightingsJson ? JSON.parse(sightingsJson) : [];

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

    const handleMenuOpen = (item) => {
        setSelectedSighting(item);
        setMenuVisible(true);
    };

    const handleMenuClose = () => {
        setMenuVisible(false);
        setSelectedSighting(null);
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

    const renderImages = (mediaUrls, sightingId) => {
        if (!mediaUrls || mediaUrls.length === 0) return null;
        if (mediaUrls.length === 1) {
            return (
                <View style={FeedScreenStyles.cardImageContainer}>
                    <Image
                        source={{ uri: mediaUrls[0] }}
                        style={FeedScreenStyles.cardImage}
                        resizeMode="contain"
                    />
                </View>
            );
        }
        // Carousel for multiple images
        return (
            <View style={FeedScreenStyles.cardImageContainer}>
                <ScrollView
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onScroll={e => {
                        const index = Math.round(e.nativeEvent.contentOffset.x / width);
                        setCarouselIndex(prev => ({ ...prev, [sightingId]: index }));
                    }}
                    scrollEventThrottle={16}
                // No style needed on the ScrollView itself for this to work
                >
                    {mediaUrls.map((url, idx) => (
                        <Image
                            key={idx}
                            source={{ uri: url }}
                            // Combine the original style with a specific width
                            style={[FeedScreenStyles.cardImage, { width: width }]}
                            resizeMode="contain"
                        />
                    ))}
                </ScrollView>
            </View>
        );
    };

    // This function renders each post with its caption and date
    const renderSightingPost = ({ item }: { item: Sighting }) => (
        <View style={FeedScreenStyles.card}>
            <View style={FeedScreenStyles.cardHeader}>
                <Image
                    source={{ uri: item.userProfilePictureUrl || 'https://ui-avatars.com/api/?name=User' }}
                    style={FeedScreenStyles.avatar}
                />
                <View style={{ flex: 1 }}>
                    <Text style={FeedScreenStyles.username}>{item.userName || 'Unknown'}</Text>
                    <Text style={FeedScreenStyles.time}>{getRelativeTime(item.createdAt)}</Text>
                </View>
                <TouchableOpacity onPress={() => handleMenuOpen(item)}>
                    <Icon name="ellipsis-h" size={22} color={Colors.light.darkNeutral} />
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
            <Text style={FeedScreenStyles.cardCaption}>{item.caption}</Text>
            <View style={FeedScreenStyles.cardActions}>
                <TouchableOpacity style={FeedScreenStyles.cardActionBtn}>
                    {item.likes > 0 && <Text style={{ marginRight: 10, color: Colors.light.primaryGreen }}>{item.likes || 0}</Text>}

                    <Icon name="heart" size={18} color={Colors.light.buttonText} />
                </TouchableOpacity>
                <View style={{ flexDirection: 'row', marginLeft: 'auto' }}>
                    <TouchableOpacity style={FeedScreenStyles.cardActionBtn}>
                        <Icon name="comment" size={18} color={Colors.light.buttonText} />
                    </TouchableOpacity>
                    <TouchableOpacity style={FeedScreenStyles.cardActionBtn}>
                        <Icon name="share" size={18} color={Colors.light.buttonText} />
                    </TouchableOpacity>
                </View>

            </View>
        </View>
    );

    // This optimization helps FlatList scroll smoothly to any item without
    // needing to render all the items in between.
    const getItemLayout = (data: Sighting[] | null | undefined, index: number) => ({
        length: ITEM_HEIGHT,
        offset: ITEM_HEIGHT * index,
        index,
    });

    return (
        <View style={FeedScreenStyles.container}>
            {/* A simple header with a back button */}
            <View style={FeedScreenStyles.header}>
                {/* Left Column */}
                <View style={FeedScreenStyles.sideContainer}>
                    <Pressable onPress={() => router.back()}>
                        <Icon name="chevron-left" size={22} color={Colors.light.primaryGreen} />
                    </Pressable>
                </View>

                {/* Center Column */}
                <View style={FeedScreenStyles.centerContainer}>
                    <Text style={FeedScreenStyles.screenTitle}>Sightings</Text>
                </View>

                {/* Right Column (acts as a spacer) */}
                <View style={FeedScreenStyles.sideContainer} />

            </View>

            <FlatList
                ref={flatListRef} // Attach the ref here
                data={allSightings}
                renderItem={renderSightingPost}
                keyExtractor={(item) => item._id}
                getItemLayout={getItemLayout} // Add the performance optimization
                
            />

            {/* Popup menu modal */}
                  <Modal
                    visible={menuVisible}
                    transparent
                    animationType="fade"
                    onRequestClose={handleMenuClose}
                  >
                    <TouchableOpacity style={FeedScreenStyles.menuOverlay} onPress={handleMenuClose} activeOpacity={1}>
                      <View style={FeedScreenStyles.menuContainer}>
                        <TouchableOpacity style={FeedScreenStyles.menuItem}>
                          <Text style={FeedScreenStyles.menuText}>Share</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={FeedScreenStyles.menuItem}>
                          <Text style={FeedScreenStyles.menuText}>Cancel</Text>
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  </Modal>
        </View>
    );
}