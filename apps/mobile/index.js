// Plain JS entry — keeps the Gradle/Metro resolver happy in monorepo + TS setups.
// All real code lives in App.tsx (TypeScript) which Babel + Metro handle.
import 'react-native-url-polyfill/auto';
import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);
