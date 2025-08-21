import { useEffect, useState } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, StyleSheet, Dimensions, Modal } from 'react-native';
import { tabStyles } from '../../constants/MainStyles';
import { apiGetSightingsNear } from '../../api/sighting';
import { Colors } from '../../constants/Colors';
import Icon from 'react-native-vector-icons/FontAwesome';
import { ScrollView } from 'react-native-gesture-handler';
import { RefreshControl } from 'react-native';

const { width } = Dimensions.get('window');

export default function FeedScreen() {
  const [sightings, setSightings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedSighting, setSelectedSighting] = useState(null);
  const [carouselIndex, setCarouselIndex] = useState({});
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchSightings();
  }, []);

  const fetchSightings = () => {
    setRefreshing(true);
    apiGetSightingsNear(-96.6974, 33.024, 10000)
      .then(data => {
        const sorted = [...data.data].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setSightings(sorted);
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

  const renderImages = (mediaUrls, sightingId) => {
    if (!mediaUrls || mediaUrls.length === 0) return null;
    if (mediaUrls.length === 1) {
      return (
        <Image
          source={{ uri: mediaUrls[0] }}
          style={styles.mainImage}
          resizeMode="cover"
        />
      );
    }
    // Carousel for multiple images
    return (
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={e => {
          const index = Math.round(e.nativeEvent.contentOffset.x / width);
          setCarouselIndex(prev => ({ ...prev, [sightingId]: index }));
        }}
        scrollEventThrottle={16}
        style={styles.carousel}
      >
        {mediaUrls.map((url, idx) => (
          <Image
            key={idx}
            source={{ uri: url }}
            style={styles.mainImage}
            resizeMode="cover"
          />
        ))}
      </ScrollView>
    );
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.header}>
        <Image
          source={{ uri: item.userProfilePictureUrl || 'https://ui-avatars.com/api/?name=User' }}
          style={styles.avatar}
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.username}>{item.username || 'Unknown'}</Text>
          <Text style={styles.time}>{getRelativeTime(item.createdAt)}</Text>
        </View>
        <TouchableOpacity onPress={() => handleMenuOpen(item)}>
          <Icon name="ellipsis-h" size={22} color={Colors.light.darkNeutral} />
        </TouchableOpacity>
      </View>
      {renderImages(item.mediaUrls, item._id)}
      {/* Carousel indicators */}
      {item.mediaUrls && item.mediaUrls.length > 1 && (
        <View style={styles.carouselIndicators}>
          {item.mediaUrls.map((_, idx) => (
            <View
              key={idx}
              style={[
                styles.carouselDot,
                carouselIndex[item._id] === idx && styles.carouselDotActive,
              ]}
            />
          ))}
        </View>
      )}
      <Text style={styles.caption}>{item.caption}</Text>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn}>
          <Icon name="thumbs-up" size={18} color={Colors.light.buttonText} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn}>
          <Icon name="comment" size={18} color={Colors.light.buttonText} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn}>
          <Icon name="share" size={18} color={Colors.light.buttonText} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[tabStyles.container]}>
      <View style={{ width: '100%', marginLeft: 8, marginBottom: 8 }}>
        <Text style={{
          fontSize: 22,
          fontWeight: 'bold',
          color: Colors.light.primaryGreen,
          letterSpacing: 1,
          textAlign: 'left',
        }}>
          Spot It Now
        </Text>
      </View>
      {loading ? (
        <Text style={{ color: Colors.light.primaryGreen }}>Loading...</Text>
      ) : (
       <FlatList
          data={sightings}
          keyExtractor={item => item._id}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={fetchSightings}
              colors={[Colors.light.primaryGreen]}
              tintColor={Colors.light.primaryGreen}
            />
          }
        />
      )}
      {/* Popup menu modal */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={handleMenuClose}
      >
        <TouchableOpacity style={styles.menuOverlay} onPress={handleMenuClose} activeOpacity={1}>
          <View style={styles.menuContainer}>
            <TouchableOpacity style={styles.menuItem}>
              <Text style={styles.menuText}>Report</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem}>
              <Text style={styles.menuText}>Share</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem}>
              <Text style={styles.menuText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

function getRelativeTime(dateString: string) {
  const now = new Date();
  const posted = new Date(dateString);
  const diffMs = now.getTime() - posted.getTime();
  const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHrs < 1) return `${Math.floor(diffMs / (1000 * 60))}m ago`;
  return `${diffHrs}h ago`;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: 4,
    shadowColor: Colors.light.shadow,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    marginRight: 10,
    backgroundColor: Colors.light.secondaryGreen,
  },
  username: {
    fontWeight: 'bold',
    fontSize: 16,
    color: Colors.light.darkNeutral,
  },
  time: {
    fontSize: 12,
    color: Colors.light.darkNeutral,
  },
  mainImage: {
    width: width - 48, // match card inner width (screen width minus card padding)
    height: 180,
    borderRadius: 12,
    marginBottom: 10,
    backgroundColor: Colors.light.softBeige,
  },
  carousel: {
    width: width - 48,
    height: 180,
    borderRadius: 12,
    marginBottom: 10,
  },
  carouselIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  carouselDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.light.secondaryGreen,
    marginHorizontal: 2,
    opacity: 0.5,
  },
  carouselDotActive: {
    backgroundColor: Colors.light.primaryGreen,
    opacity: 1,
  },
  caption: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.darkNeutral,
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 2,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.shadow,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 18,
    marginRight: 6,
  },
  actionText: {
    color: Colors.light.buttonText,
    fontWeight: 'bold',
    fontSize: 15,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 12,
    padding: 16,
    minWidth: 180,
    elevation: 5,
  },
  menuItem: {
    paddingVertical: 12,
  },
  menuText: {
    fontSize: 16,
    color: Colors.light.darkNeutral,
    textAlign: 'center',
  },
});