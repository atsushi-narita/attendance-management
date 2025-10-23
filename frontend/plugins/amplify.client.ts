import { Amplify } from 'aws-amplify'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()

  // Configure Amplify
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: config.public.cognitoUserPoolId,
        userPoolClientId: config.public.cognitoUserPoolClientId,
        identityPoolId: config.public.cognitoIdentityPoolId,
        loginWith: {
          email: true
        },
        signUpVerificationMethod: 'code',
        userAttributes: {
          email: {
            required: true
          },
          'custom:employee_number': {
            required: true
          },
          'custom:role': {
            required: true
          }
        },
        allowGuestAccess: false,
        passwordFormat: {
          minLength: 8,
          requireLowercase: true,
          requireUppercase: true,
          requireNumbers: true,
          requireSpecialCharacters: false
        }
      }
    },
    API: {
      REST: {
        AttendanceAPI: {
          endpoint: config.public.apiGatewayUrl,
          region: config.public.awsRegion
        }
      }
    }
  })
})