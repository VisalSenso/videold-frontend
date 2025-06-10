import { useState, useRef } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDownload, faPlay } from "@fortawesome/free-solid-svg-icons";
import Howto from "../components/Howto";
// Use deployed backend as default
const API_URL =
  import.meta.env.VITE_API_URL || "https://videold-backend.onrender.com";
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || API_URL;

function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [videoInfo, setVideoInfo] = useState(null);
  const [isPlaylist, setIsPlaylist] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState(null);
  const [selectedFormats, setSelectedFormats] = useState({}); // For playlist videos
  const [selectedVideos, setSelectedVideos] = useState(new Set()); // Track selected videos for batch download
  const [formatFilter, setFormatFilter] = useState("all"); // 1. Add format filter tabs state

  // Remove all download progress and socket logic

  // Helper: ensure URL has protocol
  function normalizeUrl(inputUrl) {
    if (!inputUrl) return "";
    let url = inputUrl.trim();
    // Fix missing 'h' in https
    if (url.startsWith("ttps://")) url = "h" + url;
    if (url.startsWith("tps://")) url = "ht" + url;
    if (url.startsWith("ps://")) url = "htt" + url;
    // Add protocol if missing
    if (!/^https?:\/\//i.test(url)) {
      url = "https://" + url;
    }
    return url;
  }

  const handleFetchInfo = async () => {
    const fixedUrl = normalizeUrl(url);
    if (!fixedUrl) return;
    setLoading(true);
    setVideoInfo(null);
    setIsPlaylist(false);
    setSelectedFormat(null);
    setSelectedFormats({});
    setSelectedVideos(new Set());
    try {
      const res = await fetch(`${API_URL}/api/downloads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: fixedUrl }),
      });
      const data = await res.json();
      if (data.isPlaylist) {
        setIsPlaylist(true);
        setVideoInfo({
          title: data.playlistTitle,
          videos: data.videos,
        });
      } else {
        setIsPlaylist(false);
        setVideoInfo(data);
      }
    } catch (e) {
      setVideoInfo(null);
    }
    setLoading(false);
  };

  // Helper to get selected format extension
  function selectedFormatExt() {
    if (!videoInfo || !videoInfo.formats) return null;
    const fmt = videoInfo.formats.find((f) => f.format_id === selectedFormat);
    return fmt?.ext || null;
  }

  // Helper to check if a URL is a Facebook link
  const isFacebookUrl = (url) => url && url.includes("facebook.com");

  // 2. Helper to filter formats
  const filterFormats = (formats) => {
    if (formatFilter === "all") return formats;
    return formats.filter((f) => f.ext && f.ext.toLowerCase() === formatFilter);
  };

  // New: Direct download by triggering a hidden anchor (no new tab)
  const triggerDirectDownload = (downloadUrl) => {
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.setAttribute("download", ""); // Let server set filename
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDirectDownload = () => {
    const fixedUrl = normalizeUrl(url);
    if (!fixedUrl || !selectedFormat) return;
    const params = new URLSearchParams({
      url: fixedUrl,
      quality: selectedFormat,
    });
    const downloadUrl = `${API_URL}/api/downloads?${params.toString()}`;
    triggerDirectDownload(downloadUrl);
  };

  // For playlist: direct download for each video
  const handleDirectDownloadPlaylist = (video) => {
    const params = new URLSearchParams({
      url: video.url,
      quality: selectedFormats[video.id] || video.formats?.[0]?.format_id,
    });
    const downloadUrl = `${API_URL}/api/downloads?${params.toString()}`;
    triggerDirectDownload(downloadUrl);
  };

  return (
    <div className="min-h-screen bg-[#ffffff] text-text-color p-6 flex items-center justify-center">
      <div className="w-full max-w-3xl  p-8 space-y-6">
        {/* Google AdSense ad unit */}
        <div className="flex justify-center my-4">
          <ins
            className="adsbygoogle"
            style={{ display: "block", width: "100%", minHeight: 90 }}
            data-ad-client="ca-pub-XXXXXXXXXXXXXXXX" // <-- Replace this
            data-ad-slot="1234567890" // <-- Replace this
            data-ad-format="auto"
            data-full-width-responsive="true"
          ></ins>
        </div>
        <h1 className="text-3xl font-bold text-center text-text-color">
          Video <span className="text-primary ">Downloader</span>
        </h1>
        <p className="text-center text-sm text-gray-400">
          Enter a video or playlist URL to fetch available formats and download
          options. Supports YouTube, Facebook, Instagram Tik Tok and X
          (Twitter).
        </p>

        <div className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Paste video or playlist URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="flex-1 border-2 border-[#eae9e9] px-4 py-3 rounded-lg text-text-color active:border-prbg-primary focus:border-prbg-primary focus:outline-none transition-colors duration-200"
          />
          <button
            onClick={handleFetchInfo}
            className="bg-primary cursor-pointer text-[#ffffff] px-6 py-3 rounded-lg"
          >
            {loading ? "Loading..." : "Fetch"}
          </button>
        </div>

        {isPlaylist && videoInfo?.videos?.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-center">
              {videoInfo.title}
            </h2>
            {isFacebookUrl(url) && (
              <div className="text-yellow-400 text-center text-sm font-semibold">
                For Facebook videos, only the best quality will be downloaded
                for compatibility. Quality selection is disabled.
              </div>
            )}
            <p className="text-sm text-center text-gray-400">
              Select videos to download
            </p>

            {/* Format filter tabs for playlist videos */}
            {isPlaylist && videoInfo?.videos?.length > 0 && (
              <div className="flex gap-2 mt-2 mb-2 justify-center">
                {["all", "mp4", "mkv", "webm", "mp3", "m4a"].map((type) => (
                  <button
                    key={type}
                    onClick={() => setFormatFilter(type)}
                    className={`px-3 py-1 rounded-full border text-xs font-semibold transition-colors duration-150 ${
                      formatFilter === type
                        ? "bg-primary text-white border-primary shadow"
                        : "bg-white text-primary border-gray-200 hover:bg-blue-50"
                    }`}
                  >
                    {type.toUpperCase()}
                  </button>
                ))}
              </div>
            )}

            <ul className="space-y-4 max-h-[600px] overflow-y-auto">
              {videoInfo.videos.map((video) => (
                <li
                  key={video.id}
                  className="flex flex-col sm:flex-row  rounded-xl p-4 gap-4 items-center"
                >
                  <input
                    type="checkbox"
                    checked={selectedVideos.has(video.id)}
                    onChange={() => toggleVideoSelection(video.id)}
                    className="w-5 h-5"
                  />

                  {/* Video preview with play icon overlay for playlist videos */}
                  {video.thumbnail ? (
                    <div className="relative w-48 h-28 rounded-md overflow-hidden group">
                      <img
                        src={`${API_URL}/api/proxy-thumbnail?url=${encodeURIComponent(
                          video.thumbnail
                        )}`}
                        alt={video.title}
                        className="w-48 h-28 object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition">
                        <FontAwesomeIcon
                          icon={faPlay}
                          className="text-primary drop-shadow-lg text-3xl bg-white/70 rounded-full p-2"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="w-48 h-28 bg-gray-700 flex items-center justify-center text-sm text-gray-400 rounded-md">
                      No thumbnail
                    </div>
                  )}

                  <div className="flex-1 space-y-2">
                    <h3 className="text-lg font-semibold">{video.title}</h3>

                    {/* Format filter tabs for single video */}
                    {videoInfo && !isPlaylist && videoInfo.formats && (
                      <div className="flex gap-2 mt-4 mb-2">
                        {["all", "mp4", "mkv", "webm", "mp3", "m4a"].map(
                          (type) => (
                            <button
                              key={type}
                              onClick={() => setFormatFilter(type)}
                              className={`px-3 py-1 rounded-full border text-xs font-semibold transition-colors duration-150 ${
                                formatFilter === type
                                  ? "bg-primary text-white border-primary shadow"
                                  : "bg-white text-primary border-gray-200 hover:bg-blue-50"
                              }`}
                            >
                              {type.toUpperCase()}
                            </button>
                          )
                        )}
                      </div>
                    )}

                    {isFacebookUrl(url) ? (
                      <div className="mt-3 w-full border border-[#eae9e9] px-4 py-2 rounded-md text-text-color bg-gray-100 text-center font-semibold">
                        Best available video+audio (auto-selected for
                        compatibility)
                      </div>
                    ) : (
                      <select
                        className="mt-3 w-full border border-[#eae9e9] px-4 py-2 rounded-md text-text-color focus:ring-2 focus:ring-primary focus:border-primary transition"
                        value={selectedFormats[video.id] || video.formats?.[0]?.format_id}
                        onChange={(e) => setSelectedFormats((prev) => ({ ...prev, [video.id]: e.target.value }))}
                        disabled={isFacebookUrl(url)}
                      >
                        {filterFormats(video.formats)?.map((format) => (
                          <option key={format.format_id} value={format.format_id}>
                            {format.format_note || "Unknown"} • {format.ext} • {format.filesize ? (format.filesize / (1024 * 1024)).toFixed(1) + " MB" : "N/A"}
                          </option>
                        ))}
                      </select>
                    )}

                    {/* Buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDirectDownloadPlaylist(video)}
                        className="bg-primary cursor-pointer text-text-btn px-4 py-2 rounded-md flex items-center gap-2 shadow hover:bg-blue-700 focus:ring-2 focus:ring-blue-400 transition"
                      >
                        <FontAwesomeIcon
                          icon={faDownload}
                          className="w-5 h-5"
                        />
                        Download
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {videoInfo && !isPlaylist && (
          <div className=" p-5 rounded-xl space-y-4">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              {videoInfo.thumbnail && (
                <div className="relative w-64 rounded-xl shadow-md overflow-hidden group">
                  <img
                    src={`${API_URL}/api/proxy-thumbnail?url=${encodeURIComponent(
                      videoInfo.thumbnail
                    )}`}
                    alt="Thumbnail"
                    className="w-64 rounded-xl"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition">
                    <FontAwesomeIcon
                      icon={faPlay}
                      className="text-primary drop-shadow-lg text-4xl bg-white/70 rounded-full p-3"
                    />
                  </div>
                </div>
              )}
              <div className="flex-1">
                <h2 className="text-xl font-semibold">{videoInfo.title}</h2>
                {isFacebookUrl(url) && (
                  <div className="text-yellow-400 text-sm font-semibold mb-2">
                    For Facebook videos, only the best quality will be
                    downloaded for compatibility. Quality selection is disabled.
                  </div>
                )}

                {/* Format filter tabs for single video */}
                {videoInfo && !isPlaylist && videoInfo.formats && (
                  <div className="flex gap-2 mt-4 mb-2">
                    {["all", "mp4", "mkv", "webm", "mp3", "m4a"].map((type) => (
                      <button
                        key={type}
                        onClick={() => setFormatFilter(type)}
                        className={`px-3 py-1 rounded-full border text-xs font-semibold transition-colors duration-150 ${
                          formatFilter === type
                            ? "bg-primary text-white border-primary shadow"
                            : "bg-white text-primary border-gray-200 hover:bg-blue-50"
                        }`}
                      >
                        {type.toUpperCase()}
                      </button>
                    ))}
                  </div>
                )}

                {isFacebookUrl(url) ? (
                  <div className="mt-3 w-full border border-[#eae9e9] px-4 py-2 rounded-md text-text-color bg-gray-100 text-center font-semibold">
                    Best available video+audio (auto-selected for compatibility)
                  </div>
                ) : (
                  <select
                    className="mt-3 w-full border border-[#eae9e9] px-4 py-2 rounded-md text-text-color focus:ring-2 focus:ring-primary focus:border-primary transition"
                    value={selectedFormat || ""}
                    onChange={(e) => setSelectedFormat(e.target.value)}
                    disabled={isFacebookUrl(url)}
                  >
                    {filterFormats(videoInfo.formats)?.map((format) => (
                      <option key={format.format_id} value={format.format_id}>
                        {format.resolution || format.format_note || "Unknown"} •{" "}
                        {format.ext} •{" "}
                        {format.filesize
                          ? (format.filesize / (1024 * 1024)).toFixed(1) + " MB"
                          : "N/A"}
                      </option>
                    ))}
                  </select>
                )}
                {/* Download button opens direct download in new tab */}
                <button
                  onClick={handleDirectDownload}
                  className="mt-4 w-full bg-primary cursor-pointer text-text-btn py-3 rounded-lg font-semibold"
                >
                  ⬇️ Download
                </button>
              </div>
            </div>
          </div>
        )}
        <Howto />
      </div>
    </div>
  );
}

export default Home;
