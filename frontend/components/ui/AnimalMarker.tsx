import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

interface AnimalMarkerProps {
	name: string;
	caption?: string;
	mediaUrls?: string[];
	userName?: string;
}

const AnimalMarker: React.FC<AnimalMarkerProps> = ({ name, caption, mediaUrls, userName }) => (
	<View style={styles.calloutView}>
		<Text style={styles.calloutTitle}>{name}</Text>
		{caption ? <Text style={styles.caption}>{caption}</Text> : null}
		{mediaUrls && mediaUrls.length > 0 && (
			<Image source={{ uri: mediaUrls[0] }} style={styles.image} />
		)}
		{userName && (
			<Text style={styles.poster}>Posted by - {userName}</Text>
		)}
	</View>
);

const styles = StyleSheet.create({
	calloutView: { padding: 10, minWidth: 200, alignItems: 'center', borderRadius: 16, backgroundColor: '#fff' },
	calloutTitle: { fontWeight: 'bold', fontSize: 16, color: '#333' },
	caption: { marginTop: 4, fontSize: 14, color: '#666' },
	image: { width: 80, height: 80, borderRadius: 8, marginTop: 6 },
	poster: { marginTop: 4, fontSize: 12, color: '#888' },
});

export default AnimalMarker;
