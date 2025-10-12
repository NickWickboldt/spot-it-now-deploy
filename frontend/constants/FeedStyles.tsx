import { StyleSheet } from "react-native";
import { Colors } from "./Colors";

export const FeedScreenStyles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.light.background, // Light background color
    },
    header: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        marginVertical: 10,
    },
    sideContainer: {
        flex: 1, // Takes up 1 part of the available space
        justifyContent: 'center',
    },
    centerContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    screenTitle: {
        fontSize: 28,
        color: Colors.light.primaryGreen,
        marginTop: 20,
        width: '100%',
        textAlign: 'center',
        paddingBottom: 10,
    },
    card: {
        backgroundColor: '#ffffff',
        width: '100%',
        marginBottom: 0,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        shadowColor: Colors.light.shadow,
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 1,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    avatarRing: {
        width: 48,
        height: 48,
        borderRadius: 24,
        padding: 2,
        backgroundColor: Colors.light.primaryGreen,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: Colors.light.softBeige,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.light.primaryGreen,
    },
    userInfo: {
        flex: 1,
    },
    username: {
        fontWeight: '600',
        fontSize: 16,
        color: '#1f2937',
    },
    time: {
        fontSize: 14,
        color: '#6b7280',
        marginTop: 2,
    },
    menuButton: {
        padding: 4,
    },
    cardImageContainer: {
        width: '100%',
        flex: 1,
        backgroundColor: '#f3f4f6',
        overflow: 'hidden',
    },
    cardImage: {
        width: '100%',
        height: '100%',
        backgroundColor: Colors.light.lightGrey,
    },
    cardContent: {
        padding: 12,
    },
    captionRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    cardCaption: {
        fontSize: 20,
        fontWeight: '500',
        color: '#1f2937',
        flex: 1,
    },
    cardActions: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 8,
    },
    actionGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    cardActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 4,
        borderRadius: 20,
    },
    actionText: {
        fontSize: 14,
        color: '#6b7280',
        marginLeft: 4,
    },
    carousel: {
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