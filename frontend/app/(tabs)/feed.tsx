import { useEffect, useState } from 'react';
import { Dimensions, FlatList, Image, Modal, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import Icon from 'react-native-vector-icons/FontAwesome';
import { apiGetRecentSightings } from '../../api/sighting';
import { Colors } from '../../constants/Colors';
import { FeedScreenStyles } from '../../constants/FeedStyles';

const { width } = Dimensions.get('window');

export default function FeedScreen() {
  const [sightings, setSightings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedSighting, setSelectedSighting] = useState(null);
  const [carouselIndex, setCarouselIndex] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    loadPage(1);
  }, []);

  const loadPage = (p = 1) => {
    if (p === 1) {
      setRefreshing(true);
    }
    setLoading(true);
    apiGetRecentSightings(p, pageSize)
      .then((resp) => {
        const payload = resp.data || {};
        const items = payload.items || [];
        if (p === 1) {
          setSightings(items);
        } else {
          setSightings(prev => [...prev, ...items]);
        }
        setHasMore((p * pageSize) < (payload.total || 0));
        setPage(p);
      })
      .catch(console.error)
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  };

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

  const renderItem = ({ item }) => (
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

  return (
    <View style={FeedScreenStyles.container}>
      <Text style={FeedScreenStyles.screenTitle}>
        Spot It Now
      </Text>
      {loading && sightings.length === 0 ? (
        <Text style={{ color: Colors.light.primaryGreen }}>Loading...</Text>
      ) : (
        <FlatList
          data={sightings}
          keyExtractor={item => item._id}
          renderItem={renderItem}
          onEndReached={() => { if (hasMore && !loading) loadPage(page + 1); }}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadPage(1)}
              colors={[Colors.light.primaryGreen]}
              tintColor={Colors.light.primaryGreen}
            />
          }
          ListFooterComponent={hasMore ? <Text style={{ textAlign: 'center', padding: 8 }}>Loading more...</Text> : null}
        />
      )}
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
              <Text style={FeedScreenStyles.menuText}>Report</Text>
            </TouchableOpacity>
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
