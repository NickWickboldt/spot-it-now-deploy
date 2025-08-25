import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';

type AnalysisResult = {
    type: string,
    animal: string;
    species: string;
    confidence: number;
};

interface ConfirmationModalProps {
  isVisible: boolean;
  analysisResult: AnalysisResult | null;
  onConfirm: () => void;
  onRetake: () => void;
  onOverride: () => void;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isVisible,
  analysisResult,
  onConfirm,
  onRetake,
  onOverride,
}) => {
  if (!analysisResult) {
    return null;
  }

  const { type, animal, species, confidence } = analysisResult;

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isVisible}
      onRequestClose={onRetake} // Android back button will act as "Retake"
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <Text style={styles.modalTitle}>Spotted!</Text>
          <Text style={styles.modalText}>
            It looks like you spotted a:{'\n'}
            <Text style={styles.animalName}>{type}: {animal} ({species})</Text>
            {'\n'}We are about {confidence}% sure.
          </Text>
          <Text style={styles.questionText}>Is this correct?</Text>

          {/* Action Buttons */}
          <TouchableOpacity
            style={[styles.button, styles.buttonConfirm]}
            onPress={onConfirm}
          >
            <Text style={styles.textStyle}>Yes, that's it!</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.buttonOverride]}
            onPress={onOverride}
          >
            <Text style={styles.textStyle}>That's not it... (Override)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.buttonRetake]}
            onPress={onRetake}
          >
            <Text style={styles.textStyle}>Retake Photo</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// Styles remain the same
const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalView: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '90%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  modalText: {
    marginBottom: 15,
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 24,
  },
  animalName: {
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  questionText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 20,
  },
  button: {
    borderRadius: 10,
    padding: 12,
    elevation: 2,
    width: '100%',
    marginBottom: 10,
  },
  buttonConfirm: {
    backgroundColor: '#27ae60',
  },
  buttonOverride: {
    backgroundColor: '#f39c12',
  },
  buttonRetake: {
    backgroundColor: '#7f8c8d',
  },
  textStyle: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 16,
  },
});

export default ConfirmationModal;