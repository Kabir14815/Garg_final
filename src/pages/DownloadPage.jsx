import { ANDROID_APP_HREF, ANDROID_APP_VERSION } from '../data/appDownload'
import './DownloadPage.css'

export default function DownloadPage() {
  return (
    <div className="download-page">
      <p className="download-eyebrow">Android app</p>
      <h1 className="download-title">Download Garg Jewellers</h1>
      <p className="download-lead">
        The Play Store listing is still in review. Until it is live, you can install the Android app
        directly from this site.
      </p>
      <a className="download-cta" href={ANDROID_APP_HREF} download="garg-jewellers.apk">
        Download Android app (v{ANDROID_APP_VERSION})
      </a>
      <ol className="download-steps">
        <li>Open this page on your Android phone.</li>
        <li>Tap the download button and wait for the file to finish.</li>
        <li>Open the APK. If Android asks, allow installs from this browser, then Install.</li>
      </ol>
      <p className="download-note">
        iPhone users: an unsigned <code>.app</code> file cannot be installed from a website. iOS will
        be available through the App Store after review.
      </p>
    </div>
  )
}
