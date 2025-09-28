import { StyleSheet, useColorScheme } from 'react-native';
import { Colors } from './Colors'; // Make sure the path is correct

// A hook to get theme-aware styles
export const EditProfileStyles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 40,
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
        width: '100%',
        textAlign: 'center',
    },
    formContainer: { width: '100%', paddingHorizontal: 20, backgroundColor: Colors.light.cardBackground },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
    },
    userInfo: {
        fontSize: 16,
        marginBottom: 5,
        color: Colors.light.mainText, // Dynamic text color
    },
    fieldLabel: {
        fontSize: 16,
        color: Colors.light.mainText, // Dynamic text color
        marginBottom: 6,
        marginTop: 10,
    },
    input: {
        backgroundColor: Colors.light.cardBackground,
        color: Colors.light.mainText,
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        marginBottom: 15,
    },
    halfButton: { backgroundColor: Colors.light.primaryGreen, padding: 15, borderRadius: 10, width: '48%', alignItems: 'center', marginBottom: 200 },
    buttonText: { color: 'white', fontSize: 16, fontWeight: '600' },
    locationSection: { width: '100%', marginTop: 12, marginBottom: 16 },
    locationMeta: { color: '#666', marginTop: 4 },
    locationActionButton: {
        backgroundColor: Colors.light.primaryGreen,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 10,
        alignItems: 'center',
        flexDirection: 'row',
        gap: 8,
        alignSelf: 'flex-start',
    },
    locationActionButtonDisabled: { opacity: 0.6 },
    locationActionButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
    locationStatusText: { marginTop: 8, color: '#666', fontSize: 13 },
    locationResultsContainer: { marginTop: 12, width: '100%' },
    locationResult: {
        padding: 12,
        borderRadius: 8,
        backgroundColor: Colors.light.cardBackground,
        borderWidth: 1,
        borderColor: Colors.light.secondaryGreen,
        marginTop: 8,
    },
    locationResultTitle: { fontSize: 15, fontWeight: '600', color: Colors.light.mainText },
    locationResultSubtitle: { marginTop: 4, fontSize: 13, color: '#666' },
});
