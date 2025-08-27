import React, { useState, useEffect } from 'react';
import { Image, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

type FullWidthImageProps = {
  imageUrl: string;
};

const FullWidthImage = ({ imageUrl }: FullWidthImageProps) => {
  const [imageHeight, setImageHeight] = useState<number>(300); // Default height

  useEffect(() => {
    Image.getSize(imageUrl, (sourceWidth, sourceHeight) => {
      const aspectRatio = sourceWidth / sourceHeight;
      setImageHeight(width / aspectRatio);
    }, (error) => {
      console.error(`Couldn't get image size: ${error.message}`);
    });
  }, [imageUrl]);

  return (
    <Image
      source={{ uri: imageUrl }}
      style={{
        width: '100%',
        height: imageHeight,
      }}
      resizeMode="contain"
    />
  );
};

export default FullWidthImage;