import { Dimensions, StyleSheet } from 'react-native';
import { Colors } from './Colors';

const SCREEN_WIDTH = Dimensions.get('window').width;
const FOUR_COL_BREAKPOINT = 420;

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  header: { 
    paddingTop: 50, 
    paddingHorizontal: 16, 
    paddingBottom: 16, 
    backgroundColor: Colors.light.background, 
    borderBottomWidth: 0, 
    elevation: 0 
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerIconBtn: { padding: 6 },
  title: { 
    fontSize: 28, 
    fontWeight: '700', 
    color: Colors.light.darkNeutral, 
    textAlign: 'left', 
    marginBottom: 8 
  },
  progressChipContainer: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.light.cardBackground,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.light.shadow,
    marginBottom: 12,
  },
  progressChipText: {
    color: Colors.light.darkNeutral,
    fontSize: 13,
    fontWeight: '600',
  },
  subtitle: { marginTop: 4, fontSize: 14, color: Colors.light.darkNeutral },
  searchBox: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: Colors.light.cardBackground, 
    borderRadius: 16, 
    paddingHorizontal: 14, 
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.light.shadow,
    elevation: 1 
  },
  searchInput: { 
    flex: 1, 
    color: Colors.light.darkNeutral, 
    paddingVertical: 10, 
    fontSize: 15 
  },
  tabsContainer: { flexDirection: 'row', marginVertical: 8, marginBottom: 8 },
  tabPercent: { color: Colors.light.darkNeutral, fontSize: 15, fontWeight: '600', marginTop: 2, textAlign: 'center' },
  tab: { 
    paddingVertical: 10, 
    paddingHorizontal: 18, 
    borderRadius: 20, 
    marginRight: 8, 
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.light.darkNeutral,
    elevation: 0 
  },
  tabActive: { 
    backgroundColor: Colors.light.darkNeutral, 
    borderColor: Colors.light.darkNeutral,
    elevation: 0 
  },
  tabText: { color: Colors.light.darkNeutral, fontWeight: '600', fontSize: 15 },
  tabTextActive: { color: '#fff', fontWeight: '700' },
  sectionHeader: { backgroundColor: Colors.light.cardBackground, paddingVertical: 6, paddingHorizontal: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.light.shadow, borderRadius: 10, marginBottom: 4, marginTop: 8 },
  sectionHeaderText: { color: Colors.light.mainText, fontWeight: '600', fontSize: 16 },
  grid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    justifyContent: 'space-between', 
    paddingHorizontal: 16, 
    paddingTop: 8,
    gap: 12
  },
  square: { 
    width: '48%',
    aspectRatio: 0.85,
    borderRadius: 20, 
    backgroundColor: Colors.light.cardBackground, 
    alignItems: 'center', 
    justifyContent: 'flex-start',
    paddingTop: 12,
    elevation: 2, 
    shadowColor: '#000', 
    shadowOpacity: 0.1, 
    shadowRadius: 4, 
    shadowOffset: { width: 0, height: 2 }, 
    borderWidth: 1, 
    borderColor: Colors.light.shadow, 
    overflow: 'hidden',
    marginBottom: 0
  },
  spottedSquare: { 
    borderColor: Colors.light.primaryGreen, 
    elevation: 3,
    backgroundColor: '#fff'
  },
  lockedSquare: { 
    backgroundColor: Colors.light.lightGrey, 
    opacity: 0.7, 
    borderColor: Colors.light.shadow
  },
  animalImage: { 
    width: '85%', 
    height: '65%',
    borderRadius: 16, 
    resizeMode: 'cover', 
    marginBottom: 12, 
    backgroundColor: Colors.light.softBeige
  },
  silhouette: { 
    width: '85%', 
    height: '65%',
    borderRadius: 16, 
    backgroundColor: Colors.light.darkNeutral, 
    marginBottom: 12, 
    alignItems: 'center', 
    justifyContent: 'center',
    opacity: 0.3
  },
  animalName: { 
    color: Colors.light.darkNeutral, 
    fontSize: 15, 
    textAlign: 'center', 
    fontWeight: '700',
    paddingHorizontal: 8
  },
  spottedChip: { 
    position: 'absolute', 
    top: 16, 
    right: 16, 
    backgroundColor: Colors.light.primaryGreen, 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center'
  },
  spottedChipText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  empty: { color: Colors.light.darkNeutral, textAlign: 'center', marginTop: 40 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  spottedBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.light.primaryGreen, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, marginLeft: 8 },
  spottedBadgeText: { color: '#fff', fontSize: 12, marginLeft: 4, fontWeight: '600' },
  userBadge: { backgroundColor: Colors.light.accent },
  progressBarContainer: { width: '88%', alignSelf: 'center', height: 16, backgroundColor: Colors.light.lightGrey, borderRadius: 8, marginTop: 4, marginBottom: 0, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: Colors.light.shadow },
  progressBarFill: { height: '100%', backgroundColor: Colors.light.primaryGreen, borderRadius: 8 },
  progressBarText: { position: 'absolute', width: '100%', textAlign: 'center', color: Colors.light.mainText, fontWeight: '600', fontSize: 12 },
  progressChip: { backgroundColor: Colors.light.cardBackground, borderWidth: 1, borderColor: Colors.light.shadow, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  swipeInfoContainer: { width: '100%', minHeight: 0, paddingHorizontal: 16, paddingVertical: 18, backgroundColor: Colors.light.cardBackground, borderRadius: 14, marginHorizontal: 0, elevation: 2, shadowColor: Colors.light.shadow, shadowOpacity: 0.15, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  swipeInfoTitle: { fontWeight: 'bold', fontSize: 17, color: Colors.light.mainText, marginBottom: 4, textAlign: 'left' },
  swipeInfoText: { color: Colors.light.darkNeutral, fontSize: 13, marginBottom: 2, textAlign: 'left' },
  swipeInfoLabel: { fontWeight: 'bold', color: Colors.light.mainText },
  swipePageIndicator: { textAlign: 'center', color: Colors.light.darkNeutral, marginBottom: 6, fontSize: 13, fontWeight: '600' },
});

export const modalStyles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: Colors.light.cardBackground, paddingTop: 12, paddingHorizontal: 16, paddingBottom: 32, borderTopLeftRadius: 18, borderTopRightRadius: 18, maxHeight: '85%', width: '100%' },
  handle: { width: 50, height: 5, backgroundColor: Colors.light.darkNeutral, borderRadius: 3, alignSelf: 'center', marginBottom: 12 },
  sheetTitle: { color: Colors.light.mainText, fontSize: 18, fontWeight: '700', marginBottom: 4 },
  sheetSubtitle: { color: Colors.light.darkNeutral, fontSize: 12, marginBottom: 12 },
  sightingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.light.shadow },
  thumb: { width: 54, height: 54, borderRadius: 8, backgroundColor: Colors.light.lightGrey, marginRight: 12 },
  cap: { color: Colors.light.mainText, flex: 1, fontSize: 13 },
  time: { color: Colors.light.darkNeutral, fontSize: 11, marginTop: 4 },
});