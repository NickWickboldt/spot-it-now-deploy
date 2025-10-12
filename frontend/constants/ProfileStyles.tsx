import { Dimensions, StyleSheet } from "react-native";
import { Colors } from "./Colors";


const { width } = Dimensions.get('window');
const numColumns = 3;
// Calculate the size of each item, including a small gap between them
const itemSize = (width) / numColumns; // 15 is the container padding


export const profileStyles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.light.background,
    },
    header: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 50,
        paddingHorizontal: 20,
        paddingBottom: 16,
    },
    screenTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: Colors.light.darkNeutral,
    },
    profileContainer: { 
        width: '100%', 
        backgroundColor: Colors.light.background 
    },
    
    // New Profile Header Styles
    profileHeader: {
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 16,
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    avatarContainer: {
        position: 'relative',
        marginRight: 16,
    },
    avatar: { 
        width: 80, 
        height: 80, 
        borderRadius: 40,
        borderWidth: 2,
        borderColor: Colors.light.shadow,
    },
    verifiedBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: Colors.light.primaryGreen,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    userInfoContainer: {
        flex: 1,
    },
    username: {
        fontSize: 20,
        fontWeight: '700',
        color: Colors.light.darkNeutral,
        marginBottom: 4,
    },
    bio: {
        fontSize: 13,
        color: Colors.light.darkNeutral,
        marginBottom: 8,
    },
    badgesRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 12,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.light.cardBackground,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: Colors.light.shadow,
        gap: 6,
    },
    badgeText: {
        fontSize: 11,
        color: Colors.light.darkNeutral,
        fontWeight: '600',
    },
    shareButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.light.cardBackground,
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: Colors.light.shadow,
        gap: 6,
        alignSelf: 'flex-start',
    },
    shareButtonText: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.light.darkNeutral,
    },

    // Stats Section
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingVertical: 20,
        paddingHorizontal: 20,
        marginHorizontal: 20,
        backgroundColor: '#fff',
        borderRadius: 12,
        marginBottom: 20,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    statItem: {
        alignItems: 'center',
        flex: 1,
    },
    statNumber: {
        fontSize: 24,
        fontWeight: '700',
        color: Colors.light.darkNeutral,
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 13,
        color: Colors.light.darkNeutral,
    },
    statDivider: {
        width: 1,
        height: 40,
        backgroundColor: Colors.light.shadow,
    },

    // Section Header
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.light.darkNeutral,
    },
    seeAllText: {
        fontSize: 14,
        color: Colors.light.primaryGreen,
        fontWeight: '600',
    },

    // Grid Styles
    gridRow: {
        paddingHorizontal: 20,
        gap: 2,
    },
    sightingGridItem: {
        flex: 1,
        aspectRatio: 1,
        maxWidth: (width - 44) / 3, // 20px padding on each side + 2px gap * 2
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: Colors.light.cardBackground,
    },
    sightingGridImage: {
        width: '100%',
        height: '100%',
    },
    
    // Old styles kept for compatibility
    infoContainer: { width: '100%', padding: 10, backgroundColor: 'white', display: 'flex', alignItems: 'center', flexDirection: 'row' },
    rightContainer: { display: 'flex', flexDirection: 'column', marginLeft: 20, flex: 1 },
    userInfo: { fontSize: 18, marginBottom: 10 },
    fieldLabel: { fontSize: 14, color: '#333', marginTop: 10, marginBottom: 6 },
    input: { borderWidth: 1, borderColor: '#ddd', padding: 10, borderRadius: 8, width: 300, marginBottom: 8 },
    adminContainer: { width: '100%', padding: 20, backgroundColor: '#fff0f0', borderRadius: 10, marginBottom: 20 },
    adminTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 15, textAlign: 'center', color: '#D0021B' },
    adminContainerInner: { width: '100%', paddingTop: 10, paddingBottom: 10 },
    tabBar: { flexDirection: 'row', width: '100%', marginBottom: 12 },
    tabButton: { flex: 1, padding: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
    tabButtonActive: { borderBottomColor: '#007AFF' },
    tabButtonText: { color: '#666', fontWeight: '600' },
    tabButtonTextActive: { color: '#007AFF' },
    button: { backgroundColor: '#007AFF', padding: 15, borderRadius: 10, width: '100%', alignItems: 'center', marginBottom: 10 },
    buttonText: { color: 'white', fontSize: 16, fontWeight: '600' },
    halfButton: { backgroundColor: '#007AFF', padding: 15, borderRadius: 10, width: '48%', alignItems: 'center', marginBottom: 200 },
    editProfileButton: { backgroundColor: '#34C759', padding: 15, borderRadius: 10, width: '100%', alignItems: 'center', marginBottom: 120 },
    destructiveButton: { backgroundColor: '#FF3B30' },
    logoutButton: { marginTop: 'auto', backgroundColor: '#666', marginBottom: 150 },
    logoutFloating: { position: 'absolute', right: 20, bottom: 90, backgroundColor: '#666', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 24, elevation: 4 },

    menuOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    menuContainer: {
        backgroundColor: 'white',
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
        color: '#333',
        textAlign: 'center',
    },
    emptyListText: {
        textAlign: 'center',
        color: '#666',
        marginTop: 20,
        fontSize: 16,
    },
    sightingContainer: {
      marginVertical: 10, // Adds space above and below each image
      backgroundColor: Colors.light.background, // Ensures no strange background colors
    },
});