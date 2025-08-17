import { View, Text, StyleSheet } from 'react-native';
import { tabStyles } from '../../constants/TabStyles';

export default function FeedScreen() {
  return (
    <View style={tabStyles.container}>
      <Text style={tabStyles.title}>Feed Page</Text>
    </View>
  );
}