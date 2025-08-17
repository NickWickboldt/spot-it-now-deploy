import { View, Text } from 'react-native';
import { tabStyles } from '../../constants/MainStyles';

export default function FeedScreen() {
  return (
    <View style={tabStyles.container}>
      <Text style={tabStyles.title}>Feed Page</Text>
    </View>
  );
}