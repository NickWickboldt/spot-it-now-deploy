import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    FlatList,
    Image,
    Keyboard,
    Platform,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/FontAwesome';
import { apiSearch, SearchAnimal, SearchResults, SearchSighting, SearchUser } from '../../api/search';
import { Colors } from '../../constants/Colors';
import { useAuth } from '../../context/AuthContext';

// AsyncStorage for persisting search history on native platforms
let AsyncStorageLib: any = null;
if (Platform.OS !== 'web') {
  try {
    AsyncStorageLib = require('@react-native-async-storage/async-storage').default;
  } catch {
    AsyncStorageLib = null;
  }
}

const { width } = Dimensions.get('window');
const HISTORY_KEY = 'SEARCH_HISTORY';
const TABS = ['Top', 'Users', 'Animals', 'Sightings'] as const;
type TabKey = typeof TABS[number];

export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const inputRef = useRef<TextInput>(null);

  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [results, setResults] = useState<SearchResults>({ users: [], animals: [], sightings: [] });
  const [activeTab, setActiveTab] = useState<TabKey>('Top');
  const [hasSearched, setHasSearched] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Animation for tab indicator
  const tabIndicatorAnim = useRef(new Animated.Value(0)).current;

  // Load search history on mount
  useEffect(() => {
    (async () => {
      if (!AsyncStorageLib) return;
      try {
        const stored = await AsyncStorageLib.getItem(HISTORY_KEY);
        if (stored) setHistory(JSON.parse(stored));
      } catch (err) {
        console.warn('Failed to load search history', err);
      }
    })();
    
    // Auto-focus the input
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  // Animate tab indicator
  useEffect(() => {
    const tabIndex = TABS.indexOf(activeTab);
    Animated.spring(tabIndicatorAnim, {
      toValue: tabIndex,
      useNativeDriver: true,
      friction: 8,
    }).start();
    
    // Re-search with new tab if there's an active query
    if (query.trim() && hasSearched) {
      performSearch(query, activeTab);
    }
  }, [activeTab, query, hasSearched, performSearch]);

  const addToHistory = async (text: string) => {
    if (!text.trim()) return;
    const newHistory = [text, ...history.filter((h) => h !== text)].slice(0, 10);
    setHistory(newHistory);
    if (!AsyncStorageLib) return;
    try {
      await AsyncStorageLib.setItem(HISTORY_KEY, JSON.stringify(newHistory));
    } catch (err) {
      console.warn('Failed to save search history', err);
    }
  };

  const clearHistory = async () => {
    setHistory([]);
    if (!AsyncStorageLib) return;
    try {
      await AsyncStorageLib.removeItem(HISTORY_KEY);
    } catch (err) {
      console.warn('Failed to clear search history', err);
    }
  };

  const performSearch = useCallback(async (searchQuery: string, tab: TabKey = activeTab, page: number = 1, append: boolean = false) => {
    if (!searchQuery.trim()) {
      setResults({ users: [], animals: [], sightings: [] });
      setHasSearched(false);
      setCurrentPage(1);
      setHasMore(true);
      return;
    }

    // Map tab to API search type
    const searchType = tab === 'Top' ? 'all' : tab.toLowerCase();

    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    setHasSearched(true);
    try {
      const searchResults = await apiSearch(searchQuery, searchType as 'all' | 'users' | 'animals' | 'sightings', page, 30, token || undefined);
      
      console.log('[SEARCH] Results received:', {
        sightingCount: searchResults.sightings.length,
        firstSighting: searchResults.sightings[0] ? {
          id: searchResults.sightings[0]._id,
          isLikedByUser: searchResults.sightings[0].isLikedByUser,
        } : null,
      });
      
      // Check if we got less than 30 results, meaning no more pages
      const totalFetched = searchResults.users.length + searchResults.animals.length + searchResults.sightings.length;
      setHasMore(totalFetched >= 30);
      
      if (append) {
        // Append to existing results
        setResults(prev => ({
          users: [...prev.users, ...searchResults.users],
          animals: [...prev.animals, ...searchResults.animals],
          sightings: [...prev.sightings, ...searchResults.sightings],
        }));
      } else {
        setResults(searchResults);
      }
      setCurrentPage(page);
    } catch (err) {
      console.error('Search failed:', err);
      if (!append) {
        setResults({ users: [], animals: [], sightings: [] });
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [token, activeTab]);

  // Debounced search
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onChangeText = (text: string) => {
    setQuery(text);
    setIsSearching(text.length > 0);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (text.length > 0) {
      debounceRef.current = setTimeout(() => {
        performSearch(text, activeTab);
      }, 400);
    } else {
      setResults({ users: [], animals: [], sightings: [] });
      setHasSearched(false);
    }
  };

  const handleSubmit = () => {
    if (query.trim()) {
      addToHistory(query.trim());
      performSearch(query.trim(), activeTab);
      Keyboard.dismiss();
    }
  };

  const handleHistoryItemPress = (item: string) => {
    setQuery(item);
    setIsSearching(true);
    performSearch(item, activeTab);
  };

  const handleLoadMore = () => {
    if (!loading && !loadingMore && hasMore && query.trim()) {
      performSearch(query, activeTab, currentPage + 1, true);
    }
  };

  const handleUserPress = (user: SearchUser) => {
    router.push({ pathname: '/(user)/user_profile', params: { userId: user._id } });
  };

  const handleAnimalPress = (animal: SearchAnimal) => {
    router.push({ 
      pathname: '/(user)/animal_detail', 
      params: { 
        animal: JSON.stringify(animal)
      } 
    });
  };

  const handleSightingPress = (sighting: SearchSighting) => {
    // Navigate with just the sighting ID to fetch full details
    router.push({ 
      pathname: '/(user)/sighting_detail', 
      params: { 
        sightingId: sighting._id
      } 
    });
  };

  // Get filtered results based on active tab
  const getFilteredResults = () => {
    switch (activeTab) {
      case 'Users':
        return { users: results.users, animals: [], sightings: [] };
      case 'Animals':
        return { users: [], animals: results.animals, sightings: [] };
      case 'Sightings':
        return { users: [], animals: [], sightings: results.sightings };
      case 'Top':
      default:
        return results;
    }
  };

  const filteredResults = getFilteredResults();
  const hasResults = filteredResults.users.length > 0 || filteredResults.animals.length > 0 || filteredResults.sightings.length > 0;
  const totalResults = results.users.length + results.animals.length + results.sightings.length;

  // Render functions
  const renderUserItem = ({ item }: { item: SearchUser }) => (
    <TouchableOpacity style={styles.userItem} onPress={() => handleUserPress(item)}>
      {item.profilePictureUrl ? (
        <Image
          source={{ uri: item.profilePictureUrl }}
          style={styles.userAvatar}
        />
      ) : (
        <View style={[styles.userAvatar, styles.userAvatarPlaceholder]}>
          <Icon name="user" size={24} color="#888" />
        </View>
      )}
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.username}</Text>
        {item.bio && <Text style={styles.userBio} numberOfLines={1}>{item.bio}</Text>}
      </View>
      <Icon name="chevron-right" size={16} color="#ccc" />
    </TouchableOpacity>
  );

  const renderAnimalItem = ({ item }: { item: SearchAnimal }) => (
    <TouchableOpacity style={styles.animalItem} onPress={() => handleAnimalPress(item)}>
      {item.imageUrls?.[0] ? (
        <Image
          source={{ uri: item.imageUrls[0] }}
          style={styles.animalImage}
        />
      ) : (
        <View style={[styles.animalImage, styles.animalImagePlaceholder]}>
          <Icon name="paw" size={24} color="#888" />
        </View>
      )}
      <View style={styles.animalInfo}>
        <Text style={styles.animalName}>{item.commonName}</Text>
        {item.scientificName && (
          <Text style={styles.animalScientific}>{item.scientificName}</Text>
        )}
        <View style={styles.animalMeta}>
          {item.category && (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{item.category}</Text>
            </View>
          )}
          {item.rarityLevel && (
            <View style={[styles.rarityBadge, getRarityStyle(item.rarityLevel)]}>
              <Text style={styles.rarityText}>{item.rarityLevel}</Text>
            </View>
          )}
        </View>
      </View>
      <Icon name="chevron-right" size={16} color="#ccc" />
    </TouchableOpacity>
  );

  const renderSightingItem = ({ item }: { item: SearchSighting }) => (
    <TouchableOpacity style={styles.sightingItem} onPress={() => handleSightingPress(item)}>
      <Image
        source={{ uri: item.mediaUrls?.[0] || '' }}
        style={styles.sightingImage}
      />
      <View style={styles.sightingInfo}>
        <View style={styles.sightingHeader}>
          {item.user?.profilePictureUrl ? (
            <Image
              source={{ uri: item.user.profilePictureUrl }}
              style={styles.sightingUserAvatar}
            />
          ) : (
            <View style={[styles.sightingUserAvatar, styles.sightingUserAvatarPlaceholder]}>
              <Icon name="user" size={10} color="#888" />
            </View>
          )}
          <Text style={styles.sightingUserName}>{item.user?.username || 'Unknown'}</Text>
        </View>
        <Text style={styles.sightingCaption} numberOfLines={2}>
          {item.caption || item.animalId?.commonName || item.aiIdentification || 'Wildlife sighting'}
        </Text>
        <View style={styles.sightingStats}>
          <View style={styles.sightingStat}>
            <Icon 
              name={item.isLikedByUser ? 'heart' : 'heart-o'} 
              size={12} 
              color={item.isLikedByUser ? '#FF4444' : '#999'}
            />
            <Text style={styles.sightingStatText}>{item.likes || 0}</Text>
          </View>
          <View style={styles.sightingStat}>
            <Icon name="comment" size={12} color="#999" />
            <Text style={styles.sightingStatText}>{item.comments || 0}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderHistoryItem = ({ item }: { item: string }) => (
    <TouchableOpacity style={styles.historyItem} onPress={() => handleHistoryItemPress(item)}>
      <Icon name="clock-o" size={18} color="#888" />
      <Text style={styles.historyText}>{item}</Text>
      <TouchableOpacity
        onPress={() => setHistory(prev => prev.filter(h => h !== item))}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Icon name="times" size={16} color="#ccc" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderResultsSection = (title: string, data: any[], renderItem: any, keyPrefix: string) => {
    if (data.length === 0) return null;
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {data.map((item, index) => (
          <View key={`${keyPrefix}-${item._id || index}`}>
            {renderItem({ item })}
          </View>
        ))}
      </View>
    );
  };

  const tabWidth = (width - 32) / TABS.length;
  const indicatorTranslate = tabIndicatorAnim.interpolate({
    inputRange: [0, 1, 2, 3],
    outputRange: [0, tabWidth, tabWidth * 2, tabWidth * 3],
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />

      {/* Search Bar */}
      <View style={styles.searchBarContainer}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Icon name="arrow-left" size={20} color="#333" />
        </TouchableOpacity>

        <View style={styles.inputWrapper}>
          <Icon name="search" size={16} color="#888" style={styles.searchIcon} />
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="Search users, animals, sightings..."
            placeholderTextColor="#999"
            value={query}
            onChangeText={onChangeText}
            onSubmitEditing={handleSubmit}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => onChangeText('')} style={styles.clearButton}>
              <Icon name="times-circle" size={18} color="#888" />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity onPress={handleSubmit} style={styles.searchButton}>
          <Text style={styles.searchButtonText}>Search</Text>
        </TouchableOpacity>
      </View>

      {/* Show tabs only when we have search results */}
      {hasSearched && totalResults > 0 && (
        <View style={styles.tabsContainer}>
          <View style={styles.tabRow}>
            {TABS.map((tab) => (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={styles.tabButton}
              >
                <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                  {tab}
                  {tab === 'Users' && results.users.length > 0 && (
                    <Text style={styles.tabCount}> ({results.users.length})</Text>
                  )}
                  {tab === 'Animals' && results.animals.length > 0 && (
                    <Text style={styles.tabCount}> ({results.animals.length})</Text>
                  )}
                  {tab === 'Sightings' && results.sightings.length > 0 && (
                    <Text style={styles.tabCount}> ({results.sightings.length})</Text>
                  )}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Animated.View
            style={[
              styles.tabIndicator,
              { width: tabWidth - 16, transform: [{ translateX: indicatorTranslate }] },
            ]}
          />
        </View>
      )}

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={Colors.light.primaryGreen} size="large" />
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      ) : !isSearching ? (
        /* History View */
        <View style={styles.content}>
          {history.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent Searches</Text>
                <TouchableOpacity onPress={clearHistory}>
                  <Text style={styles.clearText}>Clear all</Text>
                </TouchableOpacity>
              </View>
              <FlatList
                data={history}
                renderItem={renderHistoryItem}
                keyExtractor={(item, index) => `history-${index}`}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              />
            </>
          )}

          {history.length === 0 && (
            <View style={styles.emptyState}>
              <Icon name="search" size={48} color="#ddd" />
              <Text style={styles.emptyTitle}>Search SpotItNow</Text>
              <Text style={styles.emptyText}>
                Find users, animals, and wildlife sightings
              </Text>
            </View>
          )}
        </View>
      ) : hasSearched && !hasResults ? (
        /* No Results */
        <View style={styles.emptyState}>
          <Icon name="search" size={48} color="#ddd" />
          <Text style={styles.emptyTitle}>No results found</Text>
          <Text style={styles.emptyText}>
            Try searching with different keywords
          </Text>
        </View>
      ) : (
        /* Results View */
        <FlatList
          data={[1]} // Dummy data to render once
          keyExtractor={() => 'results'}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.resultsContent}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={() => {
            if (loadingMore && hasMore) {
              return (
                <View style={styles.loadMoreContainer}>
                  <ActivityIndicator size="small" color="#40743dff" />
                  <Text style={styles.loadMoreText}>Loading more...</Text>
                </View>
              );
            }
            if (!hasMore && hasSearched && hasResults) {
              return (
                <View style={styles.loadMoreContainer}>
                  <Text style={styles.endText}>No more results</Text>
                </View>
              );
            }
            return null;
          }}
          renderItem={() => (
            <>
              {activeTab === 'Top' ? (
                <>
                  {renderResultsSection('Users', filteredResults.users.slice(0, 5), renderUserItem, 'user')}
                  {renderResultsSection('Animals', filteredResults.animals.slice(0, 5), renderAnimalItem, 'animal')}
                  {renderResultsSection('Sightings', filteredResults.sightings.slice(0, 5), renderSightingItem, 'sighting')}
                </>
              ) : activeTab === 'Users' ? (
                renderResultsSection('Users', filteredResults.users, renderUserItem, 'user')
              ) : activeTab === 'Animals' ? (
                renderResultsSection('Animals', filteredResults.animals, renderAnimalItem, 'animal')
              ) : (
                renderResultsSection('Sightings', filteredResults.sightings, renderSightingItem, 'sighting')
              )}
            </>
          )}
        />
      )}
    </View>
  );
}

const getRarityStyle = (rarity: string) => {
  switch (rarity?.toLowerCase()) {
    case 'legendary':
      return { backgroundColor: 'rgba(255, 215, 0, 0.2)' };
    case 'rare':
      return { backgroundColor: 'rgba(138, 43, 226, 0.15)' };
    case 'uncommon':
      return { backgroundColor: 'rgba(30, 144, 255, 0.15)' };
    default:
      return { backgroundColor: 'rgba(128, 128, 128, 0.1)' };
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 10,
  },
  backButton: {
    padding: 8,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 0,
  },
  clearButton: {
    padding: 4,
  },
  searchButton: {
    paddingHorizontal: 4,
  },
  searchButtonText: {
    color: Colors.light.primaryGreen,
    fontSize: 16,
    fontWeight: '600',
  },
  tabsContainer: {
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tabRow: {
    flexDirection: 'row',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#888',
  },
  tabTextActive: {
    color: Colors.light.primaryGreen,
    fontWeight: '600',
  },
  tabCount: {
    fontSize: 12,
    color: '#888',
  },
  tabIndicator: {
    height: 3,
    backgroundColor: Colors.light.primaryGreen,
    borderRadius: 1.5,
    marginLeft: 8,
    marginBottom: -1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  clearText: {
    fontSize: 14,
    color: Colors.light.primaryGreen,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  historyText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#888',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: '#888',
    textAlign: 'center',
  },
  resultsContent: {
    padding: 16,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 24,
  },
  // User items
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f0f0',
  },
  userAvatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  userBio: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  // Animal items
  animalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  animalImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
  },
  animalImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  animalInfo: {
    flex: 1,
  },
  animalName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  animalScientific: {
    fontSize: 13,
    color: '#888',
    fontStyle: 'italic',
    marginTop: 2,
  },
  animalMeta: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  categoryBadge: {
    backgroundColor: 'rgba(64, 116, 61, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  categoryText: {
    fontSize: 11,
    color: Colors.light.primaryGreen,
    fontWeight: '500',
  },
  rarityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  rarityText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
  },
  // Sighting items
  sightingItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    gap: 12,
  },
  sightingImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
  },
  sightingInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  sightingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sightingUserAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
  },
  sightingUserAvatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  sightingUserName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  sightingCaption: {
    fontSize: 14,
    color: '#555',
    lineHeight: 18,
  },
  sightingStats: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 6,
  },
  sightingStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sightingStatText: {
    fontSize: 12,
    color: '#888',
  },
  // Load more
  loadMoreContainer: {
    paddingVertical: 20,
    alignItems: 'center',
    gap: 8,
  },
  loadMoreText: {
    fontSize: 14,
    color: '#888',
  },
  endText: {
    fontSize: 14,
    color: '#999',
  },
});
