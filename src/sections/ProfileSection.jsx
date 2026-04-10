import { useState, useEffect } from "react";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";
import { 
  getIdToken, 
  updateProfile,
  PhoneAuthProvider,
  multiFactor,
  PhoneMultiFactorGenerator,
  RecaptchaVerifier,
  signOut,
  reauthenticateWithPopup,
  GoogleAuthProvider,
  GithubAuthProvider,
  EmailAuthProvider,
  reauthenticateWithCredential
} from "firebase/auth";

const countryCodes = [
  { code: "+1", country: "US", flag: "🇺🇸", name: "United States" },
  { code: "+44", country: "GB", flag: "🇬🇧", name: "United Kingdom" },
  { code: "+254", country: "KE", flag: "🇰🇪", name: "Kenya" },
  { code: "+91", country: "IN", flag: "🇮🇳", name: "India" },
  { code: "+86", country: "CN", flag: "🇨🇳", name: "China" },
  { code: "+81", country: "JP", flag: "🇯🇵", name: "Japan" },
  { code: "+49", country: "DE", flag: "🇩🇪", name: "Germany" },
  { code: "+33", country: "FR", flag: "🇫🇷", name: "France" },
  { code: "+61", country: "AU", flag: "🇦🇺", name: "Australia" },
  { code: "+27", country: "ZA", flag: "🇿🇦", name: "South Africa" },
  { code: "+234", country: "NG", flag: "🇳🇬", name: "Nigeria" },
  { code: "+55", country: "BR", flag: "🇧🇷", name: "Brazil" },
];

function Alert({ message, type, onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, type === "success" ? 3000 : 5000);
    return () => clearTimeout(timer);
  }, [onClose, type]);

  const styles = {
    success: "bg-green-500 border-green-600",
    error: "bg-red-500 border-red-600",
    info: "bg-blue-500 border-blue-600",
    warning: "bg-yellow-500 border-yellow-600"
  };

  return (
    <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 ${styles[type]} text-white px-6 py-3 rounded-lg shadow-lg border-2 transition-all duration-300 max-w-md w-full mx-4`}>
      <div className="flex items-center justify-between gap-3">
        <span className="font-medium">{message}</span>
        <button onClick={onClose} className="text-white hover:text-gray-200 font-bold text-xl">
          ×
        </button>
      </div>
    </div>
  );
}

export default function ProfileSection({ userData, refreshUserData }) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [countryCode, setCountryCode] = useState("+254");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationId, setVerificationId] = useState(null);
  const [alert, setAlert] = useState(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [editingPhone, setEditingPhone] = useState(false);
  const [recaptchaVerifier, setRecaptchaVerifier] = useState(null);

  const showAlert = (message, type = "info") => {
    setAlert({ message, type });
  };

  const initializeRecaptcha = () => {
    return new Promise((resolve, reject) => {
      try {
        if (recaptchaVerifier) {
          resolve(recaptchaVerifier);
          return;
        }

        const container = document.getElementById('recaptcha-container');
        if (!container) {
          reject(new Error("reCAPTCHA container not found"));
          return;
        }

        container.innerHTML = '';

        const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible',
          callback: () => console.log("reCAPTCHA solved"),
          'expired-callback': () => {
            console.log("reCAPTCHA expired");
            setRecaptchaVerifier(null);
          }
        });

        verifier.render().then(() => {
          console.log("reCAPTCHA initialized");
          setRecaptchaVerifier(verifier);
          resolve(verifier);
        }).catch(reject);
      } catch (error) {
        console.error("reCAPTCHA init error:", error);
        reject(error);
      }
    });
  };

  useEffect(() => {
    let isMounted = true;

    async function fetchProfile() {
      try {
        if (!auth.currentUser) {
          throw new Error("No user logged in");
        }

        const token = await getIdToken(auth.currentUser, true);
        const res = await fetch("http://localhost:8000/api/profile", {
          headers: { 
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
        });
        
        if (!res.ok) {
          const firebaseProfile = {
            email: auth.currentUser.email,
            display_name: auth.currentUser.displayName || "User",
            uid: auth.currentUser.uid,
            created_at: auth.currentUser.metadata.creationTime,
          };
          
          if (isMounted) {
            setProfile(firebaseProfile);
            setNewName(firebaseProfile.display_name);
            setNewEmail(firebaseProfile.email);
            
            const mfaInfo = multiFactor(auth.currentUser).enrolledFactors;
            if (mfaInfo.length > 0 && mfaInfo[0].phoneNumber) {
              setPhoneNumber(mfaInfo[0].phoneNumber);
            }
          }
        } else {
          const data = await res.json();
          
          if (isMounted) {
            setProfile(data);
            setNewName(data.display_name || "");
            setNewEmail(data.email || "");
            
            const mfaInfo = multiFactor(auth.currentUser).enrolledFactors;
            if (mfaInfo.length > 0 && mfaInfo[0].phoneNumber) {
              setPhoneNumber(mfaInfo[0].phoneNumber);
            }
          }
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
        
        if (auth.currentUser && isMounted) {
          const firebaseProfile = {
            email: auth.currentUser.email,
            display_name: auth.currentUser.displayName || "User",
            uid: auth.currentUser.uid,
          };
          setProfile(firebaseProfile);
          setNewName(firebaseProfile.display_name);
          setNewEmail(firebaseProfile.email);
          
          showAlert("Using cached profile data. Some features may be limited.", "warning");
        } else {
          setError(err.message);
          if (isMounted) {
            showAlert(err.message || "Failed to load profile", "error");
          }
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    
    const timer = setTimeout(() => {
      fetchProfile();
    }, 100);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (recaptchaVerifier) {
        try {
          recaptchaVerifier.clear();
        } catch (error) {
          console.error("Error clearing reCAPTCHA:", error);
        }
      }
    };
  }, [recaptchaVerifier]);

  const handleNameChange = async () => {
    const trimmedName = newName.trim();
    
    if (!trimmedName || trimmedName.length < 2) {
      showAlert("Please enter a valid name (at least 2 characters).", "error");
      return;
    }

    if (trimmedName === profile.display_name) {
      showAlert("Name is the same as current name.", "warning");
      return;
    }

    setShowNameModal(true);
  };

  const confirmChangeName = async () => {
    setIsUpdating(true);
    setShowNameModal(false);
    showAlert("Updating name...", "info");

    try {
      const trimmedName = newName.trim();

      await updateProfile(auth.currentUser, {
        displayName: trimmedName,
      });

      try {
        const token = await getIdToken(auth.currentUser, true);
        const res = await fetch("http://localhost:8000/api/update-profile", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ display_name: trimmedName }),
        });

        if (res.ok) {
          const updated = await res.json();
          setProfile(updated);
        } else {
          setProfile({ ...profile, display_name: trimmedName });
        }
      } catch (backendError) {
        console.error("Backend update failed:", backendError);
        setProfile({ ...profile, display_name: trimmedName });
      }

      setNewName(trimmedName);
      showAlert("Name updated successfully!", "success");
      setEditingName(false);
      
      if (refreshUserData) {
        refreshUserData();
      }
    } catch (error) {
      console.error("Error changing name:", error);
      showAlert(error.message || "Failed to update name", "error");
      setNewName(profile.display_name);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleEmailChange = async () => {
    const trimmedEmail = newEmail.trim().toLowerCase();
    
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      showAlert("Please enter a valid email address.", "error");
      return;
    }

    if (trimmedEmail === profile.email.toLowerCase()) {
      showAlert("Email is the same as current email.", "warning");
      return;
    }

    setShowEmailModal(true);
  };

  const confirmChangeEmail = async () => {
    setIsUpdating(true);
    setShowEmailModal(false);
    showAlert("Reauthenticating...", "info");

    try {
      const trimmedEmail = newEmail.trim().toLowerCase();
      const user = auth.currentUser;
      
      const providerId = user.providerData[0]?.providerId;
      
      if (providerId === "google.com") {
        showAlert("Please confirm with Google...", "info");
        const provider = new GoogleAuthProvider();
        await reauthenticateWithPopup(user, provider);
      } else if (providerId === "github.com") {
        showAlert("Please confirm with GitHub...", "info");
        const provider = new GithubAuthProvider();
        await reauthenticateWithPopup(user, provider);
      } else if (providerId === "password") {
        const password = prompt("Please enter your current password to confirm:");
        if (!password) {
          setIsUpdating(false);
          showAlert("Email change cancelled.", "warning");
          return;
        }
        
        const credential = EmailAuthProvider.credential(user.email, password);
        await reauthenticateWithCredential(user, credential);
      }

      showAlert("Updating email...", "info");

      await user.updateEmail(trimmedEmail);
      console.log(" Email updated in Firebase!");

      try {
        const token = await user.getIdToken(true);
        const response = await fetch("http://localhost:8000/api/update-email", {
          method: "PUT",
          headers: { 
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ new_email: trimmedEmail })
        });

        if (response.ok) {
          console.log(" Email updated in database!");
        } else {
          console.warn("Backend email update failed, but Firebase succeeded");
        }
      } catch (backendError) {
        console.error("Backend email update failed:", backendError);
      }

      showAlert("Email updated! Logging out...", "success");
      
      setTimeout(async () => {
        await signOut(auth);
        localStorage.removeItem("authToken");
        navigate("/login");
      }, 1500);

    } catch (error) {
      console.error("Error changing email:", error);
      
      let errorMessage = "Failed to update email. ";
      
      if (error.code === "auth/requires-recent-login") {
        errorMessage = "Please sign out and sign in again before changing your email.";
      } else if (error.code === "auth/email-already-in-use") {
        errorMessage = "This email is already in use by another account.";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Invalid email format.";
      } else if (error.code === "auth/wrong-password") {
        errorMessage = "Incorrect password. Please try again.";
      } else {
        errorMessage += error.message || "Please try again.";
      }
      
      showAlert(errorMessage, "error");
      setNewEmail(profile.email);
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePhoneSetup = async () => {
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    
    if (!cleanPhone || cleanPhone.length < 6) {
      showAlert("Please enter a valid phone number.", "error");
      return;
    }

    setShowPhoneModal(true);
  };

  const confirmPhoneSetup = async () => {
    setIsUpdating(true);
    setShowPhoneModal(false);
    showAlert("Initializing verification...", "info");

    try {
      let verifier = recaptchaVerifier;
      if (!verifier) {
        showAlert("Setting up reCAPTCHA...", "info");
        verifier = await initializeRecaptcha();
      }

      const cleanPhone = phoneNumber.replace(/\D/g, '');
      const fullPhone = countryCode + cleanPhone;
      
      showAlert("Sending verification code...", "info");

      const session = await multiFactor(auth.currentUser).getSession();
      const phoneInfoOptions = {
        phoneNumber: fullPhone,
        session: session
      };

      const phoneAuthProvider = new PhoneAuthProvider(auth);
      const verificationId = await phoneAuthProvider.verifyPhoneNumber(
        phoneInfoOptions,
        verifier
      );

      setVerificationId(verificationId);
      setShowVerifyModal(true);
      showAlert("Verification code sent!", "success");
    } catch (error) {
      console.error("Error setting up phone:", error);
      
      let errorMessage = "Failed to send code. ";
      
      if (error.code === "auth/invalid-phone-number") {
        errorMessage = "Invalid phone number format.";
      } else if (error.code === "auth/too-many-requests") {
        errorMessage = "Too many requests. Try again later.";
      } else {
        errorMessage += error.message || "Please try again.";
      }
      
      showAlert(errorMessage, "error");
      
      if (recaptchaVerifier) {
        try {
          recaptchaVerifier.clear();
        } catch (e) {
          console.error("Error clearing reCAPTCHA:", e);
        }
      }
      setRecaptchaVerifier(null);
      
      const container = document.getElementById('recaptcha-container');
      if (container) container.innerHTML = '';
    } finally {
      setIsUpdating(false);
    }
  };

  const verifyPhoneCode = async () => {
    const cleanCode = verificationCode.replace(/\D/g, '');
    
    if (!cleanCode || cleanCode.length !== 6) {
      showAlert("Please enter a valid 6-digit code.", "error");
      return;
    }

    setIsUpdating(true);
    showAlert("Verifying code...", "info");

    try {
      const cred = PhoneAuthProvider.credential(verificationId, cleanCode);
      const multiFactorAssertion = PhoneMultiFactorGenerator.assertion(cred);
      
      await multiFactor(auth.currentUser).enroll(multiFactorAssertion, "Primary Phone");
      
      const cleanPhone = phoneNumber.replace(/\D/g, '');
      const fullPhone = countryCode + cleanPhone;
      
      showAlert("Phone number added successfully!", "success");
      setShowVerifyModal(false);
      setEditingPhone(false);
      setVerificationCode("");
      setPhoneNumber(fullPhone);
      
      if (recaptchaVerifier) {
        try {
          recaptchaVerifier.clear();
        } catch (e) {
          console.error("Error clearing reCAPTCHA:", e);
        }
      }
      setRecaptchaVerifier(null);
    } catch (error) {
      console.error("Error verifying code:", error);
      
      let errorMessage = "Invalid code. ";
      
      if (error.code === "auth/invalid-verification-code") {
        errorMessage = "Invalid verification code. Please try again.";
      } else if (error.code === "auth/code-expired") {
        errorMessage = "Code expired. Request a new code.";
      } else {
        errorMessage += error.message || "Please try again.";
      }
      
      showAlert(errorMessage, "error");
    } finally {
      setIsUpdating(false);
    }
  };

  const removePhone = async () => {
    if (!window.confirm("Remove phone number from two-factor authentication?")) {
      return;
    }

    setIsUpdating(true);
    showAlert("Removing phone number...", "info");

    try {
      const mfaInfo = multiFactor(auth.currentUser).enrolledFactors;
      if (mfaInfo.length > 0) {
        await multiFactor(auth.currentUser).unenroll(mfaInfo[0]);
        setPhoneNumber("");
        showAlert("Phone number removed!", "success");
      } else {
        showAlert("No phone number found.", "warning");
      }
    } catch (error) {
      console.error("Error removing phone:", error);
      
      let errorMessage = "Failed to remove phone. ";
      
      if (error.code === "auth/requires-recent-login") {
        errorMessage = "Please sign in again before removing 2FA.";
      } else {
        errorMessage += error.message || "Please try again.";
      }
      
      showAlert(errorMessage, "error");
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 space-y-4">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          </div>
        </div>
        <div className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
          Loading profile...
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-xl p-6 text-center">
          <p className="text-red-600 dark:text-red-300 font-medium mb-2">Failed to load profile</p>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">{error || "Unknown error"}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition-colors"
            >
              Retry
            </button>
            <button
              onClick={() => auth.signOut()}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  const displayName = profile?.display_name || "User";
  const firstName = displayName.split(" ")[0];
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U";

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {alert && (
        <Alert 
          message={alert.message} 
          type={alert.type} 
          onClose={() => setAlert(null)} 
        />
      )}

      <div id="recaptcha-container"></div>
      
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-800 dark:text-white">{firstName}'s Profile</h2>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center text-2xl font-bold text-blue-600">
              {initials}
            </div>
            <div className="text-white">
              <h3 className="text-2xl font-bold">{displayName}</h3>
              <p className="text-blue-100">{profile.email}</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Name Section */}
          <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Full Name
            </label>
            {editingName ? (
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your full name"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleNameChange}
                    disabled={isUpdating || !newName.trim() || newName.trim() === profile.display_name}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
                  >
                    {isUpdating ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={() => {
                      setEditingName(false);
                      setNewName(profile.display_name);
                    }}
                    disabled={isUpdating}
                    className="bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-lg text-gray-900 dark:text-white">{displayName}</p>
                <button
                  onClick={() => setEditingName(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Edit
                </button>
              </div>
            )}
          </div>

          {/* Email Section */}
          <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email Address
            </label>
            {editingEmail ? (
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your email"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleEmailChange}
                    disabled={isUpdating || !newEmail.trim() || newEmail.trim().toLowerCase() === profile.email.toLowerCase()}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
                  >
                    {isUpdating ? "Updating..." : "Save"}
                  </button>
                  <button
                    onClick={() => {
                      setEditingEmail(false);
                      setNewEmail(profile.email);
                    }}
                    disabled={isUpdating}
                    className="bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-lg text-gray-900 dark:text-white">{profile.email}</p>
                <button
                  onClick={() => setEditingEmail(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Edit
                </button>
              </div>
            )}
          </div>

          {/* Phone Section */}
          <div className="pb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Phone Number (Two-Factor Authentication)
            </label>
            {editingPhone ? (
              <div className="flex flex-col gap-3">
                <div className="flex gap-2">
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {countryCodes.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.code}
                      </option>
                    ))}
                  </select>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                    placeholder="712345678"
                    className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    autoFocus
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handlePhoneSetup}
                    disabled={isUpdating || !phoneNumber || phoneNumber.length < 6}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
                  >
                    {isUpdating ? "Sending..." : "Send Code"}
                  </button>
                  <button
                    onClick={() => {
                      setEditingPhone(false);
                      setPhoneNumber("");
                    }}
                    disabled={isUpdating}
                    className="bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : phoneNumber ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <p className="text-lg text-gray-900 dark:text-white">{phoneNumber}</p>
                  <span className="text-green-600 dark:text-green-400">✓</span>
                </div>
                <button
                  onClick={removePhone}
                  disabled={isUpdating}
                  className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-gray-500 dark:text-gray-400">No phone number added</p>
                <button
                  onClick={() => setEditingPhone(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Add Phone
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Name Modal */}
      {showNameModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-3 text-gray-800 dark:text-white">Confirm Name Change</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              Change your name to: <span className="font-semibold text-blue-600 dark:text-blue-400">{newName}</span>?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowNameModal(false);
                  setNewName(profile.display_name);
                }}
                disabled={isUpdating}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmChangeName}
                disabled={isUpdating}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400"
              >
                {isUpdating ? "Updating..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-3 text-gray-800 dark:text-white">Confirm Email Change</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              Change your email to: <span className="font-semibold text-blue-600 dark:text-blue-400">{newEmail}</span>?
            </p>
            <div className="bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-lg p-3 mb-4">
              <p className="text-xs text-yellow-800 dark:text-yellow-200">
                 <strong>Important:</strong> After changing your email, you'll be logged out and must log in again with your new email address.
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowEmailModal(false);
                  setNewEmail(profile.email);
                }}
                disabled={isUpdating}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmChangeEmail}
                disabled={isUpdating}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400"
              >
                {isUpdating ? "Updating..." : "Update Email"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Phone Modal */}
      {showPhoneModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-3 text-gray-800 dark:text-white">Add Phone for 2FA</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              Add phone number: <span className="font-semibold text-blue-600 dark:text-blue-400">{countryCode + phoneNumber}</span>?
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900 p-3 rounded mb-4">
              📱 You'll receive a verification code via SMS.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowPhoneModal(false);
                }}
                disabled={isUpdating}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmPhoneSetup}
                disabled={isUpdating}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400"
              >
                {isUpdating ? "Sending..." : "Send Code"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Verify Phone Modal */}
      {showVerifyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-3 text-gray-800 dark:text-white">Enter Verification Code</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              Enter the 6-digit code sent to {countryCode + phoneNumber}
            </p>
            <input
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              maxLength={6}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 mb-4 text-center text-2xl tracking-widest bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowVerifyModal(false);
                  setVerificationCode("");
                }}
                disabled={isUpdating}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={verifyPhoneCode}
                disabled={isUpdating || verificationCode.length !== 6}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400"
              >
                {isUpdating ? "Verifying..." : "Verify"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}