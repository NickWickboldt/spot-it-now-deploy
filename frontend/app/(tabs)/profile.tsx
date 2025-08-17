import { View, Text, StyleSheet } from 'react-native';
import { tabStyles } from '../../constants/TabStyles';

export default function ProfileScreen() {
  return (
    <View style={tabStyles.container}>
      <Text style={tabStyles.title}>Profile Page</Text>
    </View>
  );
}

