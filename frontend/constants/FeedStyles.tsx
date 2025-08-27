import { StyleSheet } from "react-native";
import { Colors } from "./Colors";

export const FeedScreenStyles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 40,
        backgroundColor: Colors.light.background, // Light background color
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
        backgroundColor: Colors.light.cardBackground,
        shadowColor: Colors.light.shadow,
        shadowOpacity: 0.12,
        shadowRadius: 8,
        elevation: 3,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
    },
    avatar: {
        width: 40,
        height: 40,
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
    cardImageContainer: {
        width: '100%',
        aspectRatio: 1, // This makes the height equal to the width
        marginBottom: 10,
        backgroundColor: Colors.light.softBeige,
    },
    cardImage: {
        width: '100%',
        height: '100%',
        marginBottom: 10,
        backgroundColor: Colors.light.lightGrey,
    },
    cardCaption: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.light.darkNeutral,
        marginBottom: 12,
        paddingHorizontal: 12,
    },
    cardActions: {
        flexDirection: 'row',
        gap: 2,
        paddingHorizontal: 12,
        marginBottom: 12,
    },
    cardActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 8,
        paddingVertical: 6,
        paddingHorizontal: 18,
        marginRight: 6,
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