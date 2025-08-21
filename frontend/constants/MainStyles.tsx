import { StyleSheet } from "react-native";
import { Colors } from "./Colors";



// A shared style for the tab screens to keep them consistent
export const tabStyles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop:40,
        paddingHorizontal: 8,
        backgroundColor:Colors.light.shadow, // Light background color
    },
});