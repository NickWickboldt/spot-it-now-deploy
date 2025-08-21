export type RootTabParamList = {
  // The 'feed' screen takes no parameters.
  feed: undefined; 

  // The 'spotit' screen can optionally receive a 'takePicture' function in its parameters.
  spotit: { 
    takePicture?: () => void; 
  };

  // The 'profile' screen takes no parameters.
  profile: undefined;
};

// This next part is important for making these types globally available to Expo Router.
// It merges our custom param list with the default React Navigation types.
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootTabParamList {}
  }
}