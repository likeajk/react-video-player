import { useRef, useState, useEffect } from 'react';
import Hls from 'hls.js';
import {
	FaPlay,
	FaPause,
	FaStop,
	FaExpand,
	FaCompress,
	FaVolumeUp,
	FaVolumeMute,
	FaCog,
} from 'react-icons/fa';

const VideoPlayer = ({ src, thumbnail, videoLength, chapters }) => {
	const videoRef = useRef(null);
	const hlsRef = useRef(null);
	const intervalRef = useRef(null);
	const [isPlaying, setIsPlaying] = useState(false);
	const [isFullScreen, setIsFullScreen] = useState(false);
	const [progress, setProgress] = useState(0);
	const [volume, setVolume] = useState(1);
	const [isMuted, setIsMuted] = useState(false);
	const [useNativeControls, setUseNativeControls] = useState(
		window.innerWidth < 767,
	);
	const [qualities, setQualities] = useState([]);
	const [currentQuality, setCurrentQuality] = useState(-1); // -1 = Auto
	const [showQualityMenu, setShowQualityMenu] = useState(false);
	const [hoverTime, setHoverTime] = useState(null);
	const [hoverChapter, setHoverChapter] = useState(null);
	const [tooltipPosition, setTooltipPosition] = useState(0);
	const timelineRef = useRef(null);

	// Initialize HLS
	useEffect(() => {
		const video = videoRef.current;

		if (!video || !src) return;

		// Check if it's an HLS stream
		const isHlsStream = src.includes('.m3u8');

		if (isHlsStream && Hls.isSupported()) {
			const hls = new Hls({
				enableWorker: true,
				lowLatencyMode: true,
			});

			hlsRef.current = hls;
			hls.loadSource(src);
			hls.attachMedia(video);

			hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
				console.log('HLS manifest parsed, levels:', data.levels);

				// Extract available quality levels
				const availableLevels = data.levels.map((level, index) => ({
					index,
					height: level.height,
					width: level.width,
					bitrate: level.bitrate,
					label: level.height ? `${level.height}p` : `${Math.round(level.bitrate / 1000)}kbps`,
				}));

				setQualities(availableLevels);
			});

			hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
				console.log('Quality level switched to:', data.level);
			});

			hls.on(Hls.Events.ERROR, (event, data) => {
				console.error('HLS error:', data);
				if (data.fatal) {
					switch (data.type) {
						case Hls.ErrorTypes.NETWORK_ERROR:
							console.log('Network error, trying to recover...');
							hls.startLoad();
							break;
						case Hls.ErrorTypes.MEDIA_ERROR:
							console.log('Media error, trying to recover...');
							hls.recoverMediaError();
							break;
						default:
							console.log('Unrecoverable error');
							hls.destroy();
							break;
					}
				}
			});

			return () => {
				hls.destroy();
				hlsRef.current = null;
			};
		} else if (video.canPlayType('application/vnd.apple.mpegurl')) {
			// Safari native HLS support
			video.src = src;
		} else if (!isHlsStream) {
			// Regular video file
			video.src = src;
		}
	}, [src]);

	// Handle quality change
	const handleQualityChange = (levelIndex) => {
		if (hlsRef.current) {
			hlsRef.current.currentLevel = levelIndex;
			setCurrentQuality(levelIndex);
			setShowQualityMenu(false);
		}
	};

	// Get current quality label
	const getCurrentQualityLabel = () => {
		if (currentQuality === -1) {
			return 'Auto';
		}
		const quality = qualities.find(q => q.index === currentQuality);
		return quality ? quality.label : 'Auto';
	};

	useEffect(() => {
		const handleResize = () => {
			setUseNativeControls(window.innerWidth < 767);
		};

		window.addEventListener('resize', handleResize);

		return () => {
			window.removeEventListener('resize', handleResize);
		};
	}, []);

	const updateProgress = () => {
		if (videoRef.current) {
			const value =
				(videoRef.current.currentTime / videoRef.current.duration) * 100;
			setProgress(value);
		}
	};

	useEffect(() => {
		const video = videoRef.current;

		const handleVideoEnd = () => {
			setIsPlaying(false);
			setProgress(0);
			stopProgressLoop();
		};

		if (video) {
			video.addEventListener('ended', handleVideoEnd);
		}

		return () => {
			if (video) {
				video.removeEventListener('ended', handleVideoEnd);
			}
			stopProgressLoop();
		};
	}, []);

	const startProgressLoop = () => {
		if (intervalRef.current) {
			clearInterval(intervalRef.current);
		}

		intervalRef.current = setInterval(() => {
			updateProgress();
		}, 1000);
	};

	const stopProgressLoop = () => {
		if (intervalRef.current) {
			clearInterval(intervalRef.current);
			intervalRef.current = null;
		}
	};

	const togglePlayPause = () => {
		if (videoRef.current) {
			if (videoRef.current.paused) {
				videoRef.current.play();
				setIsPlaying(true);
				startProgressLoop();
			} else {
				videoRef.current.pause();
				setIsPlaying(false);
				stopProgressLoop();
			}
		}
	};

	const stopVideo = () => {
		if (videoRef.current) {
			videoRef.current.pause();
			videoRef.current.currentTime = 0;
			setIsPlaying(false);
		}
	};

	const handleSeek = (event) => {
		const seekTo = (event.target.value / 100) * videoRef.current.duration;
		videoRef.current.currentTime = seekTo;
		setProgress(event.target.value);
	};

	// Format time as MM:SS
	const formatTime = (seconds) => {
		const mins = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	};

	// Get chapter at a specific time
	const getChapterAtTime = (time) => {
		if (!chapters || chapters.length === 0) return null;
		return chapters.find(chapter => time >= chapter.start && time <= chapter.end);
	};

	// Handle timeline hover
	const handleTimelineHover = (event) => {
		if (!timelineRef.current || !videoLength) return;

		const rect = timelineRef.current.getBoundingClientRect();
		const x = event.clientX - rect.left;
		const percentage = x / rect.width;
		const time = percentage * videoLength;

		setHoverTime(Math.max(0, Math.min(time, videoLength)));
		setHoverChapter(getChapterAtTime(time));
		setTooltipPosition(x);
	};

	// Handle timeline leave
	const handleTimelineLeave = () => {
		setHoverTime(null);
		setHoverChapter(null);
	};

	// Handle timeline click to seek
	const handleTimelineClick = (event) => {
		if (!timelineRef.current || !videoRef.current) return;

		const rect = timelineRef.current.getBoundingClientRect();
		const x = event.clientX - rect.left;
		const percentage = x / rect.width;
		const duration = videoRef.current.duration || videoLength;
		const seekTime = percentage * duration;

		videoRef.current.currentTime = seekTime;
		setProgress(percentage * 100);
	};

	const toggleMute = () => {
		const currentVolume = videoRef.current.volume;
		if (currentVolume > 0) {
			videoRef.current.volume = 0;
			setVolume(0);
			setIsMuted(true);
		} else {
			videoRef.current.volume = 1;
			setVolume(1);
			setIsMuted(false);
		}
	};

	const handleVolumeChange = (event) => {
		const newVolume = event.target.value;
		videoRef.current.volume = newVolume;
		setVolume(newVolume);
		setIsMuted(newVolume === 0);
	};

	const toggleFullScreen = () => {
		if (!isFullScreen) {
			if (videoRef.current.requestFullscreen) {
				videoRef.current.requestFullscreen();
			} else if (videoRef.current.mozRequestFullScreen) {
				videoRef.current.mozRequestFullScreen();
			} else if (videoRef.current.webkitRequestFullscreen) {
				videoRef.current.webkitRequestFullscreen();
			} else if (videoRef.current.msRequestFullscreen) {
				videoRef.current.msRequestFullscreen();
			}
		} else {
			if (document.exitFullscreen) {
				document.exitFullscreen();
			} else if (document.mozCancelFullScreen) {
				document.mozCancelFullScreen();
			} else if (document.webkitExitFullscreen) {
				document.webkitExitFullscreen();
			} else if (document.msExitFullscreen) {
				document.msExitFullscreen();
			}
		}
		setIsFullScreen(!isFullScreen);
	};

	useEffect(() => {
		const handleFullScreenChange = () =>
			setIsFullScreen(!!document.fullscreenElement);
		document.addEventListener('fullscreenchange', handleFullScreenChange);

		return () => {
			document.removeEventListener('fullscreenchange', handleFullScreenChange);
		};
	}, []);

	const renderQualitySelector = () => {
		return (
			<div className="quality-selector">
				<button
					className="quality-btn"
					onClick={() => setShowQualityMenu(!showQualityMenu)}
				>
					<FaCog />
					<span className="quality-label">{getCurrentQualityLabel()}</span>
				</button>
				{showQualityMenu && (
					<div className="quality-menu">
						<div
							className={`quality-option ${currentQuality === -1 ? 'active' : ''}`}
							onClick={() => handleQualityChange(-1)}
						>
							Auto
						</div>
						{qualities
							.sort((a, b) => b.height - a.height)
							.map((quality) => (
								<div
									key={quality.index}
									className={`quality-option ${currentQuality === quality.index ? 'active' : ''}`}
									onClick={() => handleQualityChange(quality.index)}
								>
									{quality.label}
									{quality.height >= 1080 && <span className="hd-badge">HD</span>}
								</div>
							))}
					</div>
				)}
			</div>
		);
	};

	const renderCustomControls = () => {
		return (
			<div className="video-controls">
				<button onClick={togglePlayPause}>
					{isPlaying ? <FaPause /> : <FaPlay />}
				</button>
				<button onClick={stopVideo}>
					<FaStop />
				</button>
				{/* Custom Timeline with Chapters */}
				<div
					className="timeline-container"
					ref={timelineRef}
					onMouseMove={handleTimelineHover}
					onMouseLeave={handleTimelineLeave}
					onClick={handleTimelineClick}
				>
					{/* Tooltip */}
					{hoverTime !== null && (
						<div
							className="timeline-tooltip"
							style={{ left: `${tooltipPosition}px` }}
						>
							<div className="tooltip-time">{formatTime(hoverTime)}</div>
							{hoverChapter && (
								<div className="tooltip-chapter">{hoverChapter.title}</div>
							)}
						</div>
					)}

					{/* Chapter segments */}
					<div className="timeline-track">
						{chapters && chapters.length > 0 ? (
							chapters.map((chapter, index) => {
								const startPercent = (chapter.start / videoLength) * 100;
								const widthPercent = ((chapter.end - chapter.start) / videoLength) * 100;
								return (
									<div
										key={index}
										className="chapter-segment"
										style={{
											left: `${startPercent}%`,
											width: `${widthPercent}%`,
										}}
									/>
								);
							})
						) : (
							<div className="chapter-segment" style={{ left: 0, width: '100%' }} />
						)}

						{/* Progress fill */}
						<div
							className="timeline-progress"
							style={{ width: `${progress}%` }}
						/>

						{/* Playhead */}
						<div
							className="timeline-playhead"
							style={{ left: `${progress}%` }}
						/>
					</div>
				</div>
				<button onClick={toggleMute}>
					{isMuted ? <FaVolumeMute /> : <FaVolumeUp />}
				</button>
				<input
					type='range'
					className="volume-bar"
					min='0'
					max='1'
					step='0.05'
					value={volume}
					onChange={handleVolumeChange}
				/>
				{qualities.length > 0 && renderQualitySelector()}
				<button onClick={toggleFullScreen}>
					{isFullScreen ? <FaCompress /> : <FaExpand />}
				</button>
			</div>
		);
	};

	return (
		<div className="video-container">
			<video
				className='video-player'
				ref={videoRef}
				poster={thumbnail}
				onClick={togglePlayPause}
				onPlay={startProgressLoop}
				onPause={stopProgressLoop}
				controls={useNativeControls}
			/>
			{!useNativeControls && renderCustomControls()}
		</div>
	);
};

export default VideoPlayer;
