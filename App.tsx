import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';

import { PlayScreen } from './src/screens/PlayScreen';
import { ThemeProvider, useTheme } from './src/theme';

export default function App() {
  return (
    <ThemeProvider>
      <AppShell />
    </ThemeProvider>
  );
}

function AppShell() {
  const { appTheme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: appTheme.screen }]}>
      <StatusBar style="light" />
      <PlayScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#171a18',
  },
});
