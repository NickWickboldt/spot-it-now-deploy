import { StyleSheet } from "react-native";
import { Colors } from "./Colors";

export const LoginScreenStyles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'flex-start',
        alignItems: 'center',
        backgroundColor: Colors.light.background,
        paddingTop: 130,
    },
    logo: {
        width: 300,
        height: 300,
        resizeMode: 'contain',
    },
    input: {
        width: '80%',
        height: 50,
        backgroundColor: Colors.light.cardBackground,
        borderRadius: 10,
        paddingHorizontal: 15,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: Colors.light.secondaryGreen,
        color: Colors.light.darkNeutral,
        fontSize: 16,
    },
    button: {
        backgroundColor: Colors.light.primaryGreen,
        paddingVertical: 15,
        borderRadius: 10,
        width: '80%',
        alignItems: 'center',
        shadowColor: Colors.light.shadow,
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 2,
    },
    buttonText: {
        color: Colors.light.background,
        fontSize: 18,
        fontWeight: '600',
    },
});