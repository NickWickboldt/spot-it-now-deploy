import { StyleSheet } from "react-native";
import { Colors } from "./Colors";


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
        justifyContent: 'center',
        paddingTop:30,
        paddingHorizontal: 20,
    },
    screenTitle: {
        fontSize: 28,
        color: Colors.light.primaryGreen,
        marginTop: 20,
        width: '100%',
        paddingBottom: 10,
    },
    profileContainer: { width: '100%' },
    infoContainer: { width: '100%', padding: 10, backgroundColor: 'white', marginBottom: 10, display: 'flex', alignItems: 'center', flexDirection: 'row' },
    rightContainer: { display: 'flex', flexDirection: 'column', marginLeft: 20, flex: 1 },
    userInfo: { fontSize: 18, marginBottom: 10 },
    avatar: { width: 120, height: 120, borderRadius: 60, marginBottom: 10 },
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
});