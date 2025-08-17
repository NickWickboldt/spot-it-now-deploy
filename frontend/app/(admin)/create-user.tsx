// ==================================================================
// File: app/create-user.tsx
// ==================================================================
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { apiCreateUser } from '../../api/admin';
import { useRouter } from 'expo-router';

export default function CreateUserScreen() {
    const { token } = useAuth();
    const router = useRouter();
    
    // Required fields
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    // Optional fields from the user model
    const [profilePictureUrl, setProfilePictureUrl] = useState('');
    const [bio, setBio] = useState('');

    const [isLoading, setIsLoading] = useState(false);

    const handleCreateUser = async () => {
        if (!username || !email || !password) {
            Alert.alert("Error", "Please fill all required fields (username, email, password).");
            return;
        }
        // if (!token || token === 'local-admin-fake-token') {
        //     Alert.alert("Error", "You must be a real admin to create users.");
        //     return;
        // }

        setIsLoading(true);

        // Construct the user data object, including optional fields if they are filled out
        const userData = {
            username,
            email,
            password,
            profilePictureUrl: profilePictureUrl || undefined,
            bio: bio || undefined,
        };

        try {
            await apiCreateUser(token, userData);
            Alert.alert("Success", "User created successfully!");
            router.back(); // Go back to the previous screen
        } catch (error: any) {
            Alert.alert("Creation Failed", error.message || "An error occurred.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <ScrollView contentContainerStyle={createUserStyles.container}>
            <Text style={createUserStyles.label}>Username <Text style={createUserStyles.required}>*</Text></Text>
            <TextInput style={createUserStyles.input} value={username} onChangeText={setUsername} />

            <Text style={createUserStyles.label}>Email <Text style={createUserStyles.required}>*</Text></Text>
            <TextInput style={createUserStyles.input} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />

            <Text style={createUserStyles.label}>Password <Text style={createUserStyles.required}>*</Text></Text>
            <TextInput style={createUserStyles.input} value={password} onChangeText={setPassword} secureTextEntry />

            <Text style={createUserStyles.label}>Profile Picture URL (Optional)</Text>
            <TextInput style={createUserStyles.input} value={profilePictureUrl} onChangeText={setProfilePictureUrl} />

            <Text style={createUserStyles.label}>Bio (Optional)</Text>
            <TextInput style={[createUserStyles.input, createUserStyles.textArea]} value={bio} onChangeText={setBio} multiline />

            <Pressable style={createUserStyles.button} onPress={handleCreateUser} disabled={isLoading}>
                {isLoading ? <ActivityIndicator color="white" /> : <Text style={createUserStyles.buttonText}>Create User</Text>}
            </Pressable>
        </ScrollView>
    );
}

const createUserStyles = StyleSheet.create({
    container: { padding: 20 },
    label: { fontSize: 16, fontWeight: '500', marginBottom: 5 },
    input: { height: 50, backgroundColor: 'white', borderRadius: 10, paddingHorizontal: 15, marginBottom: 20, borderWidth: 1, borderColor: '#ddd' },
    textArea: {
        height: 100,
        textAlignVertical: 'top', // Align text to the top for multiline
        paddingTop: 15,
    },
    button: { backgroundColor: '#007AFF', paddingVertical: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
    buttonText: { color: 'white', fontSize: 18, fontWeight: '600' },
    required: {
        color: 'red',
    }
});
