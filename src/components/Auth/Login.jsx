import React, { useState, useEffect } from "react";
import { 
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  GithubAuthProvider
} from "firebase/auth";
import { auth } from "../../firebase";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { LogIn } from "lucide-react";
import { fetchProfile } from "../../api";

export default function Login() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const isFromExtension = searchParams.get('source') === 'extension';
  const redirectToExtension = searchParams.get('redirect') === 'extension';

  useEffect(() => {
    if (auth.currentUser && !isFromExtension) {
      navigate("/dashboard");
    }
  }, [navigate, isFromExtension]);

  const syncWithExtension = async (userCredential) => {
    const user = userCredential.user;
    
    console.log("==================================================");
    console.log(" [SYNC] STARTING EXTENSION SYNC (FINAL SOLUTION)");
    console.log("==================================================");
    
    try {
      const idToken = await user.getIdToken();
      console.log(" [SYNC] Firebase token obtained");

      const profileResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/profile`, {
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!profileResponse.ok) {
        throw new Error(`Backend profile failed: ${profileResponse.status}`);
      }

      const userData = await profileResponse.json();
      console.log(" [SYNC] Backend user data received:", userData);

      //  METHOD 1: Use window.postMessage to communicate with content script
      console.log(" [SYNC] Using window.postMessage to communicate with extension...");
      
      const syncData = {
        type: 'PHISHNET_AUTH_SYNC',
        action: 'SAVE_AUTH',
        userData: {
          id: userData.id || 1,
          email: userData.email,
          display_name: userData.display_name || user.displayName || userData.email.split('@')[0],
          firebase_uid: userData.firebase_uid || user.uid,
          role: userData.role || 'user'
        },
        token: idToken
      };
      
      window.postMessage(syncData, '*');
      console.log(" [SYNC] window.postMessage sent");
      
      //  METHOD 2: Use localStorage as a bridge
      const localStorageData = {
        phishnet_auth: {
          user: syncData.userData,
          token: syncData.token,
          timestamp: Date.now()
        }
      };
      
      localStorage.setItem('phishnet_auth_sync', JSON.stringify(localStorageData));
      console.log(" [SYNC] localStorage backup written");
      
      //  METHOD 3: Try URL parameters for content script
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('source') === 'extension') {
        console.log(" [SYNC] Extension context detected, using URL parameter method");
        
        // Create a temporary element to store data for content script
        const tempAuthData = document.createElement('div');
        tempAuthData.id = 'phishnet_temp_auth';
        tempAuthData.style.display = 'none';
        tempAuthData.setAttribute('data-auth', JSON.stringify(syncData));
        document.body.appendChild(tempAuthData);
        console.log(" [SYNC] Temporary DOM element created");
      }

      //  METHOD 4: Try direct storage as last resort
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        console.log(" [SYNC] Attempting direct chrome.storage write...");
        
        const storageData = {
          hasBackendUser: true,
          hasBackendToken: true,
          backendUserType: userData.role || 'user',
          backendTokenType: 'jwt',
          userEmail: userData.email,
          userName: userData.display_name,
          backendUser: syncData.userData,
          backendToken: idToken
        };
        
        try {
          await new Promise((resolve, reject) => {
            chrome.storage.local.set(storageData, () => {
              if (chrome.runtime.lastError) {
                console.log(" [SYNC] Direct storage failed:", chrome.runtime.lastError.message);
                resolve(); // Don't fail, just continue
              } else {
                console.log(" [SYNC] Direct storage write successful!");
                resolve();
              }
            });
          });
        } catch (storageError) {
          console.log(" [SYNC] Storage error caught, but continuing...");
        }
      }

      console.log("==================================================");
      console.log(" [SYNC] ALL SYNC METHODS COMPLETED!");
      console.log("==================================================");
      
      return { user: userData };
      
    } catch (error) {
      console.error("==================================================");
      console.error(" [SYNC] SYNC FAILED:");
      console.error(error);
      console.error("==================================================");
      throw error;
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      console.log(" [LOGIN] Starting login for:", email);
      
      const userCredential = await signInWithEmailAndPassword(auth, email, pw);
      console.log(" [LOGIN] Firebase login successful:", userCredential.user.email);

      console.log(" [LOGIN] Calling syncWithExtension...");
      await syncWithExtension(userCredential);
      console.log(" [LOGIN] syncWithExtension completed");
      
      // Wait for sync to complete
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      try {
        await fetchProfile();
        console.log(" [LOGIN] Backend profile synced");
      } catch (syncError) {
        console.log(" [LOGIN] Profile sync optional:", syncError.message);
      }

      if (isFromExtension && redirectToExtension) {
        console.log(" [LOGIN] Extension login - closing tab in 3 seconds");
        setError("");
        
        const successMsg = document.createElement('div');
        successMsg.className = 'mb-4 text-sm text-green-600 text-center bg-green-50 py-3 px-4 rounded-lg font-medium';
        successMsg.innerHTML = ' <strong>Login successful!</strong><br/>Extension synced. This tab will close in 3 seconds...';
        
        const form = document.querySelector('form');
        if (form) {
          form.insertBefore(successMsg, form.firstChild);
        }
        
        setTimeout(() => {
          console.log(" Closing tab now...");
          window.close();
        }, 3000);
      } else {
        console.log(" [LOGIN] Web login - navigating to dashboard");
        navigate("/dashboard");
      }
      
    } catch (err) {
      console.error(" [LOGIN] Login failed:", err);
      
      if (err.code === "auth/user-not-found" || err.code === "auth/invalid-credential") {
        setError("Invalid email or password.");
      } else if (err.code === "auth/wrong-password") {
        setError("Incorrect password.");
      } else if (err.code === "auth/too-many-requests") {
        setError("Too many attempts. Try again later.");
      } else {
        setError("Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);
    const provider = new GoogleAuthProvider();

    try {
      console.log(" [GOOGLE] Starting Google login...");
      
      const userCredential = await signInWithPopup(auth, provider);
      console.log(" [GOOGLE] Firebase login successful:", userCredential.user.email);

      console.log(" [GOOGLE] Calling syncWithExtension...");
      await syncWithExtension(userCredential);
      console.log(" [GOOGLE] syncWithExtension completed");
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      try {
        await fetchProfile();
      } catch (syncError) {
        console.log(" [GOOGLE] Profile sync optional");
      }

      if (isFromExtension && redirectToExtension) {
        console.log(" [GOOGLE] Extension login - closing tab in 3 seconds");
        setError("");
        
        const successMsg = document.createElement('div');
        successMsg.className = 'mb-4 text-sm text-green-600 text-center bg-green-50 py-3 px-4 rounded-lg font-medium';
        successMsg.innerHTML = ' <strong>Google login successful!</strong><br/>Extension synced. This tab will close in 3 seconds...';
        
        const form = document.querySelector('form');
        if (form) {
          form.insertBefore(successMsg, form.firstChild);
        }
        
        setTimeout(() => {
          window.close();
        }, 3000);
      } else {
        console.log(" [GOOGLE] Web login - navigating to dashboard");
        navigate("/dashboard");
      }
      
    } catch (err) {
      console.error(" [GOOGLE] Google login failed:", err);
      setError("Google login failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGithubLogin = async () => {
    setError("");
    setLoading(true);
    const provider = new GithubAuthProvider();

    try {
      console.log(" [GITHUB] Starting GitHub login...");
      
      const userCredential = await signInWithPopup(auth, provider);
      console.log(" [GITHUB] Firebase login successful:", userCredential.user.email);

      console.log(" [GITHUB] Calling syncWithExtension...");
      await syncWithExtension(userCredential);
      console.log(" [GITHUB] syncWithExtension completed");
      
      await new Promise(resolve => setTimeout(resolve, 2000));

      const syncWithExtension = async (userCredential) => {
  const user = userCredential.user;
  
  console.log("==================================================");
  console.log(" [SYNC] STARTING EXTENSION SYNC");
  console.log("==================================================");
  
  try {
    const idToken = await user.getIdToken();
    console.log(" [SYNC] Firebase token obtained");

    const profileResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/profile`, {
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!profileResponse.ok) {
      throw new Error(`Backend profile failed: ${profileResponse.status}`);
    }

    const userData = await profileResponse.json();
    console.log(" [SYNC] Backend user data received:", userData.email);

    // THIS IS THE CRITICAL LINE - Get your extension ID
    const EXTENSION_ID = 'daimeonlggajkiafbehdehnhmgjaplcm'; // ← REPLACE THIS
    
    console.log(" [SYNC] Sending to extension:", EXTENSION_ID);

    // Send message to extension
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      try {
        chrome.runtime.sendMessage(EXTENSION_ID, {
          action: 'backendAuthenticated',
          user: {
            id: userData.id,
            email: userData.email,
            display_name: userData.display_name || user.displayName || userData.email.split('@')[0],
            firebase_uid: user.uid,
            role: userData.role || 'user'
          },
          token: idToken
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.error(" [SYNC] Failed:", chrome.runtime.lastError.message);
          } else {
            console.log(" [SYNC] SUCCESS!", response);
          }
        });
      } catch (err) {
        console.error(" [SYNC] Error:", err);
      }
    } else {
      console.log(" [SYNC] Chrome runtime not available");
    }

    console.log("==================================================");
    console.log(" [SYNC] EXTENSION SYNC COMPLETE");
    console.log("==================================================");
    
    return { user: userData };
    
  } catch (error) {
    console.error(" [SYNC] SYNC FAILED:", error);
    throw error;
  }
};
      
      try {
        await fetchProfile();
      } catch (syncError) {
        console.log(" [GITHUB] Profile sync optional");
      }

      if (isFromExtension && redirectToExtension) {
        console.log(" [GITHUB] Extension login - closing tab in 3 seconds");
        setError("");
        
        const successMsg = document.createElement('div');
        successMsg.className = 'mb-4 text-sm text-green-600 text-center bg-green-50 py-3 px-4 rounded-lg font-medium';
        successMsg.innerHTML = ' <strong>GitHub login successful!</strong><br/>Extension synced. This tab will close in 3 seconds...';
        
        const form = document.querySelector('form');
        if (form) {
          form.insertBefore(successMsg, form.firstChild);
        }
        
        setTimeout(() => {
          window.close();
        }, 3000);
      } else {
        console.log(" [GITHUB] Web login - navigating to dashboard");
        navigate("/dashboard");
      }
      
    } catch (err) {
      console.error(" [GITHUB] GitHub login failed:", err);
      setError("GitHub login failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-100 to-white">
      <div className="bg-white shadow-xl rounded-2xl p-8 w-full max-w-md border border-purple-200">
        <div className="flex items-center justify-center mb-6">
          <LogIn className="text-purple-600 mr-2" size={26} />
          <h2 className="text-2xl font-semibold text-center text-purple-700">
            Log In to PhishNet
          </h2>
        </div>

  
        {error && (
          <p className="mb-4 text-sm text-red-600 text-center bg-red-50 py-2 px-3 rounded-lg">
            {error}
          </p>
        )}

        <div className="space-y-3 mb-6">
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span className="font-medium">Continue with Google</span>
          </button>

          <button
            onClick={handleGithubLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition disabled:opacity-50"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            <span className="font-medium">Continue with GitHub</span>
          </button>
        </div>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Or continue with email</span>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="Email address"
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400"
          />

          <div className="relative">
            <input
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-2.5 text-gray-500 hover:text-purple-600 text-sm"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 transition duration-300 disabled:opacity-50"
          >
            {loading ? "Logging in..." : "Log In"}
          </button>
        </form>

        <div className="mt-4 text-center text-sm text-gray-600">
          <Link to="/forgot" className="text-purple-600 hover:text-purple-800 hover:underline">
            Forgot password?
          </Link>
        </div>

        <div className="mt-3 text-center text-sm text-gray-600">
          Don't have an account?{" "}
          <Link 
            to={isFromExtension ? `/signup?source=extension&redirect=extension` : "/signup"} 
            className="text-purple-700 hover:text-purple-900 hover:underline font-medium"
          >
            Create one
          </Link>
        </div>
      </div>
    </div>
  );
}