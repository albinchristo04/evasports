
import React, { useEffect, useRef } from 'react';
import { StreamType } from '../../types';
// Import Hls.js if you want to support HLS streams
// import Hls from 'hls.js'; 

interface VideoPlayerProps {
  streamUrl: string;
  streamType: StreamType;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ streamUrl, streamType }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Basic HLS.js integration example - uncomment and install hls.js if needed
    /*
    if (streamType === StreamType.HLS && streamUrl.endsWith('.m3u8') && videoRef.current) {
      if (Hls.isSupported()) {
        const hls = new Hls();
        hls.loadSource(streamUrl);
        hls.attachMedia(videoRef.current);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          videoRef.current?.play().catch(e => console.error("Autoplay prevented:", e));
        });
        return () => {
          hls.destroy();
        };
      } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS support (e.g., Safari)
        videoRef.current.src = streamUrl;
        videoRef.current.addEventListener('loadedmetadata', () => {
          videoRef.current?.play().catch(e => console.error("Autoplay prevented:", e));
        });
      }
    }
    */
  }, [streamUrl, streamType]);

  if (!streamUrl) {
    return (
      <div className="aspect-video w-full bg-gray-700 flex items-center justify-center rounded-lg">
        <p className="text-gray-400 text-lg">No stream URL provided.</p>
      </div>
    );
  }

  switch (streamType) {
    case StreamType.IFRAME:
      return (
        <iframe
          src={streamUrl}
          title="Match Stream"
          className="aspect-video w-full rounded-lg shadow-xl"
          allow="autoplay; encrypted-media"
          allowFullScreen
        ></iframe>
      );
    case StreamType.VIDEO:
      return (
        <video
          ref={videoRef}
          src={streamUrl}
          controls
          autoPlay
          className="aspect-video w-full rounded-lg shadow-xl bg-black"
        ></video>
      );
    case StreamType.HLS:
      // Basic HLS.js support (see useEffect) or placeholder
      if (streamUrl.endsWith('.m3u8')) { // Attempt with basic video tag for HLS if Hls.js not fully integrated
         return (
          <video ref={videoRef} controls autoPlay className="aspect-video w-full rounded-lg shadow-xl bg-black">
            <source src={streamUrl} type="application/vnd.apple.mpegurl" />
            Your browser does not support HLS streams directly.
          </video>
        );
      }
      return (
        <div className="aspect-video w-full bg-gray-700 flex items-center justify-center rounded-lg">
          <p className="text-gray-400">HLS Stream: <a href={streamUrl} target="_blank" rel="noopener noreferrer" className="text-accent underline">{streamUrl}</a> (Player integration needed for direct playback)</p>
        </div>
      );
    case StreamType.DASH:
      return (
        <div className="aspect-video w-full bg-gray-700 flex items-center justify-center rounded-lg">
          <p className="text-gray-400">MPEG-DASH Stream: <a href={streamUrl} target="_blank" rel="noopener noreferrer" className="text-accent underline">{streamUrl}</a> (Player integration needed)</p>
        </div>
      );
    default:
      return (
        <div className="aspect-video w-full bg-gray-700 flex items-center justify-center rounded-lg">
          <p className="text-gray-400">Unsupported stream type or no stream available.</p>
        </div>
      );
  }
};

export default VideoPlayer;
    