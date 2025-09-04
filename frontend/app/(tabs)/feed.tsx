import { useEffect, useState } from 'react';
import { Dimensions, FlatList, Image, Modal, Platform, RefreshControl, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import Icon from 'react-native-vector-icons/FontAwesome';
import { apiGetRecentSightings } from '../../api/sighting';
import { Colors } from '../../constants/Colors';
import { FeedScreenStyles } from '../../constants/FeedStyles';

const { width } = Dimensions.get('window');

// Simple Coming Soon placeholder for non-Discover tabs
const ComingSoonScreen = () => (
  <View style={comingSoonStyles.container}>
    <StatusBar barStyle="light-content" />
    <Icon name="rocket" size={80} color="#fff" style={comingSoonStyles.icon} />
    <Text style={comingSoonStyles.title}>Coming Soon!</Text>
    <Text style={comingSoonStyles.subtitle}>We're working hard to bring you something amazing.</Text>
    <Text style={comingSoonStyles.subtitle}>Stay tuned!</Text>
  </View>
);

const TABS = ['Community', 'Following','Local','Discover'] as const;
type TabKey = typeof TABS[number];

export default function FeedScreen() {
  const [activeTab, setActiveTab] = useState<TabKey>('Discover');
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

  // Derive a base status padding; on iOS StatusBar.currentHeight is often undefined so we add a manual safe area offset
  const baseStatus = Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0;
  const iosExtra = Platform.OS === 'ios' ? 20 : 0; // additional space for notch/dynamic island
  const statusPad = baseStatus + iosExtra;
  // Increase the vertical offset so the tab bar sits further below notches/dynamic island
  const extraOffset = 36; // previously 12
  const tabBarHeight = 38; // slightly slimmer
  return (
    <View style={FeedScreenStyles.container}>
      <StatusBar barStyle="light-content" />

      {/* TikTok-style absolute tabs */}
  <View style={[tabStyles.absoluteBar, { top: statusPad + extraOffset }]}> 
        {TABS.map(tab => {
          const active = tab === activeTab;
          return (
            <TouchableOpacity
              key={tab}
              style={tabStyles.absTabItem}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.75}
            >
              <Text style={[tabStyles.absTabText, active && tabStyles.absTabTextActive]} numberOfLines={1}>{tab}</Text>
              {active && <View style={tabStyles.absIndicator} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {activeTab === 'Discover' ? (
        loading && sightings.length === 0 ? (
          <Text style={{ color: Colors.light.primaryGreen, paddingTop: tabBarHeight + statusPad + extraOffset + 8 }}>Loading...</Text>
        ) : (
          <FlatList
            data={sightings}
            keyExtractor={item => item._id}
            renderItem={renderItem}
            onEndReached={() => { if (hasMore && !loading) loadPage(page + 1); }}
            onEndReachedThreshold={0.5}
            contentContainerStyle={{ paddingTop: tabBarHeight + statusPad + extraOffset + 8, paddingBottom: 32 }}
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
        )
      ) : (
  <View style={{ flex:1, paddingTop: tabBarHeight + statusPad + extraOffset }}>
          <ComingSoonScreen />
        </View>
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

const tabStyles = StyleSheet.create({
  // New absolute bar mimicking TikTok top tabs
  absoluteBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    zIndex: 20,
  },
  absTabItem: {
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 6,
    alignItems: 'center',
  },
  absTabText: {
  color: '#888',
  fontSize: 16,
  fontWeight: '600',
  letterSpacing: 0.3,
  },
  absTabTextActive: {
  color: '#fff',
  fontWeight: '700',
  },
  absIndicator: {
  marginTop: 3,
  height: 2,
  width: 18,
  borderRadius: 2,
  backgroundColor: Colors.light.primaryGreen,
  },
});

const comingSoonStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121214', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  icon: { marginBottom: 30 },
  title: { fontSize: 36, fontWeight: 'bold', color: '#fff', textAlign: 'center', marginBottom: 15 },
  subtitle: { fontSize: 18, color: '#a1a1a6', textAlign: 'center', lineHeight: 26 },
});
