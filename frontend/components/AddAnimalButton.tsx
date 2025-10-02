import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AddAnimalModal from './AddAnimalModal';

type Props = { defaultCommonName?: string };

export const AddAnimalButton: React.FC<Props> = ({ defaultCommonName }) => {
  const [open, setOpen] = useState(false);
  return (
    <View>
      <TouchableOpacity style={styles.btn} onPress={() => setOpen(true)}>
        <Text style={styles.txt}>Add Animal To DB</Text>
      </TouchableOpacity>
      <AddAnimalModal visible={open} onClose={() => setOpen(false)} defaultCommonName={defaultCommonName} />
    </View>
  );
};

const styles = StyleSheet.create({
  btn: { backgroundColor: '#10b981', paddingVertical: 12, paddingHorizontal: 18, borderRadius: 8, alignSelf: 'flex-start' },
  txt: { color: '#fff', fontWeight: '600' },
});

export default AddAnimalButton;
