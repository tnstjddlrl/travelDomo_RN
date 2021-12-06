import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  BackHandler,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import messaging from '@react-native-firebase/messaging';

import SplashScreen from 'react-native-splash-screen'
import PushNotification from 'react-native-push-notification';


async function requestUserPermission() {
  const authStatus = await messaging().requestPermission();
  const enabled =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL;

  if (enabled) {
    console.log('Authorization status:', authStatus);
  }
}

var cbc;

const App = () => {
  const [uri, setUri] = useState({ uri: 'https://traveldomo.cafe24.com/' })

  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      function () {
        if (cbc && rnw) {
          rnw.goBack();
          return true;
        } else {
          Alert.alert('앱 종료', '앱을 종료하시겠습니까?',
            [
              {
                text: "취소",
                onPress: () => console.log("Cancel Pressed"),
                style: "cancel"
              },
              { text: "확인", onPress: () => BackHandler.exitApp() }
            ])
        }
        return true;
      }
    );
    return () => backHandler.remove();
  }, []);

  useEffect(() => {
    const unsubscribe = messaging().onMessage(async remoteMessage => {
      PushNotification.localNotification({
        channelId: "fcm_alert",
        invokeApp: true,
        title: remoteMessage.notification.title, // (optional)
        message: remoteMessage.notification.body, // (required)
      })
    });

    return unsubscribe;
  }, []);


  const [pushToken, setPushToken] = useState('')
  const [isAuthorized, setIsAuthorized] = useState(false)

  const handlePushToken = useCallback(async () => {
    const enabled = await messaging().hasPermission()
    if (enabled) {
      const fcmToken = await messaging().getToken()
      if (fcmToken) setPushToken(fcmToken)
    } else {
      const authorized = await messaging.requestPermission()
      if (authorized) setIsAuthorized(true)
    }
  }, [])

  const saveDeviceToken = useCallback(async () => {
    if (isAuthorized) {
      const currentFcmToken = await firebase.messaging().getToken()
      if (currentFcmToken !== pushToken) {
        return saveTokenToDatabase(currentFcmToken)
      }
      return messaging().onTokenRefresh((token) => saveTokenToDatabase(token))
    }
  }, [pushToken, isAuthorized])

  useEffect(() => {
    requestUserPermission()
    try {
      handlePushToken()
      saveDeviceToken()

      setTimeout(() => {
        console.log(pushToken)
      }, 1000);

    } catch (error) {
      console.log(error)
      Alert.alert('토큰 받아오기 실패')
    }

  }, [])


  function onMessage(event) {
    console.log(event.nativeEvent.data)
    if (event.nativeEvent.data == 'token') {
      rnw.postMessage(pushToken)
      console.log('토큰 전송! : ' + pushToken)
    }

    if (event.nativeEvent.data == 'test') {
      rnw.postMessage('test')
      console.log('테스트! : test')
    }
  }

  return (
    <SafeAreaView style={{ width: '100%', height: '100%' }}>
      <WebView
        ref={wb => { rnw = wb }}
        onMessage={event => {
          onMessage(event)
        }}
        onLoadEnd={() => {
          SplashScreen.hide();
        }}
        pullToRefreshEnabled={true}
        style={{ width: '100%', height: '100%' }}
        onNavigationStateChange={(navState) => { cbc = navState.canGoBack; }}
        geolocationEnabled
        allowUniversalAccessFromFileURLs
        allowFileAccess
        source={uri}></WebView>
    </SafeAreaView>
  )
}

export default App;