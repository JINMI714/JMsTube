import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  Settings,
  History,
  BarChart3,
  RotateCcw,
  Play,
  Key,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronRight,
  Filter,
  Palette,
} from "lucide-react";

const decodeHTMLEntities = (text) => {
  const entities = {
    "&quot;": '"',
    "&#39;": "'",
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&#34;": '"',
  };
  return text.replace(
    /&quot;|&#39;|&amp;|&lt;|&gt;|&#34;/g,
    (match) => entities[match]
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState("analysis");
  const [searchQuery, setSearchQuery] = useState("");
  const [videos, setVideos] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const [statusMsg, setStatusMsg] = useState("준비 완료");
  const [viewMode, setViewMode] = useState("comfort");

  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: "desc",
  });

  const [limit, setLimit] = useState("100");
  const [customLimit, setCustomLimit] = useState("");
  const [period, setPeriod] = useState("7일");
  const [customPeriod, setCustomPeriod] = useState("");
  const [country, setCountry] = useState("KR");
  const [customCountry, setCustomCountry] = useState("");
  const [isStrict, setIsStrict] = useState(false);

  const [videoType, setVideoType] = useState("전체");
  const [ciiGreat, setCiiGreat] = useState(true);
  const [ciiGood, setCiiGood] = useState(true);
  const [ciiBad, setCiiBad] = useState(true);
  const [minViews, setMinViews] = useState("");
  const [maxViews, setMaxViews] = useState("");
  const [minSubs, setMinSubs] = useState("");
  const [maxSubs, setMaxSubs] = useState("");

  const [theme, setTheme] = useState(
    () => localStorage.getItem("jms_theme") || "Light"
  );
  const [apiKey, setApiKey] = useState(
    () => localStorage.getItem("jms_api_key") || ""
  );
  const [searchHistory, setSearchHistory] = useState(() => {
    const saved = localStorage.getItem("jms_history");
    return saved ? JSON.parse(saved) : [];
  });

  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    localStorage.setItem("jms_theme", theme);
    const updateTheme = () => {
      const dark =
        theme === "Dark" ||
        (theme === "System" &&
          window.matchMedia("(prefers-color-scheme: dark)").matches);
      setIsDark(dark);
      document.documentElement.classList.toggle("dark", dark);
    };
    updateTheme();

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (theme === "System") updateTheme();
    };
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);

  const cx = (lightClass, darkClass) => (isDark ? darkClass : lightClass);

  useEffect(() => {
    localStorage.setItem("jms_api_key", apiKey);
  }, [apiKey]);
  useEffect(() => {
    localStorage.setItem("jms_history", JSON.stringify(searchHistory));
  }, [searchHistory]);

  const handleThumbnailClick = (imgUrl, title) => {
    const newWindow = window.open("", "_blank");
    if (newWindow) {
      newWindow.document.write(`
        <html>
          <head>
            <title>${title} - 썸네일</title>
            <style>
              @import url("https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css");
              body { font-family: "Pretendard", sans-serif; margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; height: 100vh; background-color: #09090B; }
              img { max-width: 100%; max-height: 100%; object-fit: contain; box-shadow: 0 0 50px rgba(217, 70, 239, 0.3); border-radius: 12px; }
            </style>
          </head>
          <body><img src="${imgUrl}" alt="${title}"/></body>
        </html>
      `);
      newWindow.document.close();
    }
  };

  const handleSearch = async (queryToSearch = searchQuery) => {
    if (!apiKey) {
      alert("자갸! 설정 탭에서 API 키를 먼저 등록해줘~");
      setActiveTab("settings");
      return;
    }
    if (!queryToSearch.trim()) return;

    setIsSearching(true);
    setSearchQuery(queryToSearch);
    setStatusMsg("유튜브 데이터를 검색하고 있습니다...");
    setSortConfig({ key: null, direction: "desc" });

    try {
      let finalLimit = limit;
      if (limit === "직접 기입") finalLimit = customLimit || "50";
      if (finalLimit === "전체") finalLimit = "50";
      const maxRes = parseInt(finalLimit) || 50;

      let finalCountry = country;
      if (country === "직접 기입") finalCountry = customCountry.toUpperCase();

      let regionQuery = "";
      if (finalCountry && finalCountry !== "전체") {
        regionQuery = `&regionCode=${finalCountry}`;
        if (isStrict) {
          const langMap = { KR: "ko", US: "en", JP: "ja", UK: "en", FR: "fr" };
          if (langMap[finalCountry]) {
            regionQuery += `&relevanceLanguage=${langMap[finalCountry]}`;
          }
        }
      }

      let finalPeriod = period;
      if (period === "직접 기입") finalPeriod = customPeriod;

      let dateQuery = "";
      if (finalPeriod && finalPeriod !== "전체") {
        const daysMatch = String(finalPeriod).match(/(\d+)/);
        if (daysMatch) {
          const days = parseInt(daysMatch[1], 10);
          const pastDate = new Date();
          pastDate.setDate(pastDate.getDate() - days);
          dateQuery = `&publishedAfter=${pastDate.toISOString()}`;
        }
      }

      const apiUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=${maxRes}&q=${encodeURIComponent(
        queryToSearch
      )}&type=video${regionQuery}${dateQuery}&key=${apiKey}`;

      const res = await fetch(apiUrl);
      const data = await res.json();

      if (data.error) {
        alert("API 키 에러: " + data.error.message);
        setStatusMsg("에러가 발생했습니다. 키를 확인해주세요.");
      } else if (data.items && data.items.length > 0) {
        setStatusMsg("상세 데이터를 불러오는 중...");

        const videoIds = data.items.map((item) => item.id.videoId).join(",");
        const statsRes = await fetch(
          `https://www.googleapis.com/youtube/v3/videos?part=statistics,contentDetails&id=${videoIds}&key=${apiKey}`
        );
        const statsData = await statsRes.json();

        const detailedVideos = data.items.map((item) => {
          const detail =
            statsData.items.find((stat) => stat.id === item.id.videoId) || {};
          return { ...item, ...detail, exactVideoId: item.id.videoId };
        });

        setVideos(detailedVideos);

        const newHistoryItem = {
          id: Date.now(),
          term: queryToSearch,
          date: new Date().toLocaleString("ko-KR"),
        };
        const filteredHistory = searchHistory.filter(
          (item) => item.term !== queryToSearch
        );
        setSearchHistory([newHistoryItem, ...filteredHistory].slice(0, 50));

        setStatusMsg("검색 완료!");
        setTimeout(() => setStatusMsg("준비 완료"), 3000);
      } else {
        setVideos([]);
        setStatusMsg("검색 결과가 없습니다.");
      }
    } catch (e) {
      alert("데이터를 불러오지 못했어!");
      setStatusMsg("인터넷 연결 오류가 발생했습니다.");
    }
    setIsSearching(false);
  };

  const clearResults = () => {
    if (window.confirm("모든 검색 결과를 삭제하시겠습니까?")) {
      setVideos([]);
      setStatusMsg("데이터가 초기화되었습니다");
      setTimeout(() => setStatusMsg("준비 완료"), 3000);
    }
  };

  const handleApiReset = () => {
    if (
      window.confirm("저장된 API 키를 삭제하고 설정 화면으로 이동하시겠습니까?")
    ) {
      setApiKey("");
      setVideos([]);
      setSearchQuery("");
      setActiveTab("settings");
      setStatusMsg("API 키가 초기화되었습니다. 새 키를 입력해주세요.");
    }
  };

  const clearHistory = () => {
    if (window.confirm("정말 모든 검색 기록을 지울까 자갸?"))
      setSearchHistory([]);
  };

  const deleteHistoryItem = (idToDelete) => {
    setSearchHistory((prevHistory) =>
      prevHistory.filter((item) => item.id !== idToDelete)
    );
  };

  const resetSidebarFilters = () => {
    setLimit("100");
    setCustomLimit("");
    setPeriod("7일");
    setCustomPeriod("");
    setCountry("KR");
    setCustomCountry("");
    setIsStrict(false);
    setVideoType("전체");
    setCiiGreat(true);
    setCiiGood(true);
    setCiiBad(true);
    setMinViews("");
    setMaxViews("");
    setMinSubs("");
    setMaxSubs("");
    setSearchQuery("");
    setVideos([]);
    setSortConfig({ key: null, direction: "desc" });
    setStatusMsg("필터 해제 - 전체 0개 비디오");
    setTimeout(() => setStatusMsg("준비 완료"), 3000);
  };

  const formatNum = (num) => {
    if (!num) return "0";
    const n = Number(num);
    if (n >= 10000) return (n / 10000).toFixed(1) + "만";
    return n.toLocaleString();
  };

  const formatDate = (dateString) => {
    const d = new Date(dateString);
    return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`;
  };

  const formatDuration = (pt) => {
    if (!pt) return "-";
    const match = pt.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return pt;
    const h = match[1] || "";
    const m = match[2] || "0";
    const s = match[3] ? match[3].padStart(2, "0") : "00";
    return h ? `${h}:${m.padStart(2, "0")}:${s}` : `${m}:${s}`;
  };

  const parseDurationToSeconds = (pt) => {
    if (!pt) return 0;
    const match = pt.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    const h = parseInt(match[1] || 0, 10);
    const m = parseInt(match[2] || 0, 10);
    const s = parseInt(match[3] || 0, 10);
    return h * 3600 + m * 60 + s;
  };

  const getCIIBadge = (likes, views) => {
    const ratio = (Number(likes) / Number(views)) * 100 || 0;
    if (ratio >= 4.0)
      return {
        label: "Great",
        color:
          cx(
            "text-emerald-600",
            "text-[#00FFA3] drop-shadow-[0_0_6px_rgba(0,255,163,0.5)]"
          ) + " font-black",
        value: ratio,
      };
    if (ratio >= 2.0)
      return {
        label: "Good",
        color:
          cx(
            "text-amber-500",
            "text-[#FFD600] drop-shadow-[0_0_6px_rgba(255,214,0,0.5)]"
          ) + " font-black",
        value: ratio,
      };
    return {
      label: "Bad",
      color:
        cx(
          "text-rose-500",
          "text-[#FF1744] drop-shadow-[0_0_6px_rgba(255,23,68,0.5)]"
        ) + " font-black",
      value: ratio,
    };
  };

  const handleSort = (key) => {
    let direction = "desc";
    if (sortConfig.key === key && sortConfig.direction === "desc") {
      direction = "asc";
    }
    setSortConfig({ key, direction });
  };

  const sortedVideos = useMemo(() => {
    let sortableItems = [...videos];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        let aValue, bValue;
        const subsA = 10000;
        const subsB = 10000;

        const decodedTitleA = decodeHTMLEntities(a.snippet.title).toLowerCase();
        const decodedTitleB = decodeHTMLEntities(b.snippet.title).toLowerCase();

        switch (sortConfig.key) {
          case "title":
            aValue = decodedTitleA;
            bValue = decodedTitleB;
            break;
          case "channel":
            aValue = a.snippet.channelTitle.toLowerCase();
            bValue = b.snippet.channelTitle.toLowerCase();
            break;
          case "views":
            aValue = Number(a.statistics?.viewCount || 0);
            bValue = Number(b.statistics?.viewCount || 0);
            break;
          case "subs":
            aValue = subsA;
            bValue = subsB;
            break;
          case "date":
            aValue = new Date(a.snippet.publishedAt).getTime();
            bValue = new Date(b.snippet.publishedAt).getTime();
            break;
          case "duration":
            aValue = parseDurationToSeconds(a.contentDetails?.duration);
            bValue = parseDurationToSeconds(b.contentDetails?.duration);
            break;
          case "likes":
            aValue = Number(a.statistics?.likeCount || 0);
            bValue = Number(b.statistics?.likeCount || 0);
            break;
          case "comments":
            aValue = Number(a.statistics?.commentCount || 0);
            bValue = Number(b.statistics?.commentCount || 0);
            break;
          case "subViewRatio":
            aValue = Number(a.statistics?.viewCount || 0) / subsA;
            bValue = Number(b.statistics?.viewCount || 0) / subsB;
            break;
          case "likeRatio":
          case "cii":
            aValue =
              Number(a.statistics?.likeCount || 0) /
              Number(a.statistics?.viewCount || 1);
            bValue =
              Number(b.statistics?.likeCount || 0) /
              Number(b.statistics?.viewCount || 1);
            break;
          case "type":
            aValue = (a.contentDetails?.duration || "").includes("M")
              ? "롱폼"
              : "쇼츠";
            bValue = (b.contentDetails?.duration || "").includes("M")
              ? "롱폼"
              : "쇼츠";
            break;
          default:
            return 0;
        }

        if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [videos, sortConfig]);

  const renderSortableHeader = (label, sortKey, align = "text-center") => {
    const isActive = sortConfig.key === sortKey;
    const justifyClass =
      align === "text-right"
        ? "justify-end"
        : align === "text-left"
        ? "justify-start"
        : "justify-center";

    return (
      <th
        className={`p-3.5 font-bold text-sm tracking-wide ${align} cursor-pointer group transition-colors select-none ${
          isActive
            ? cx("text-purple-600", "text-[#D946EF]")
            : cx(
                "text-slate-500 hover:text-purple-600",
                "text-gray-400 hover:text-[#D946EF]"
              )
        }`}
        onClick={() => handleSort(sortKey)}
      >
        <div className={`flex items-center gap-1.5 ${justifyClass}`}>
          {label}
          {isActive ? (
            <span
              className={`text-[10px] ${cx(
                "text-purple-600",
                "text-[#D946EF]"
              )} transition-transform`}
            >
              {sortConfig.direction === "asc" ? "▲" : "▼"}
            </span>
          ) : (
            <span className="text-[10px] opacity-0 group-hover:opacity-40 transition-opacity">
              ▼
            </span>
          )}
        </div>
      </th>
    );
  };

  const labelStyle = `font-extrabold ${cx(
    "text-slate-600",
    "text-gray-300"
  )} text-xs mb-2 block tracking-widest uppercase`;
  const inputStyle = `w-full border ${cx(
    "border-slate-200 bg-slate-50 text-slate-800",
    "border-[#27272A] bg-[#09090B] text-gray-100 placeholder-gray-500"
  )} rounded-xl py-2.5 px-3.5 outline-none hover:border-[#D946EF] ${cx(
    "focus:bg-white",
    "focus:bg-[#121212]"
  )} focus:border-[#D946EF] focus:ring-[3px] focus:ring-[#D946EF]/30 text-sm font-bold transition-all`;

  const primaryBtnClass =
    "bg-gradient-to-r from-[#EC4899] to-[#9333EA] text-white shadow-lg shadow-purple-500/30 hover:from-[#F472B6] hover:to-[#A855F7] border-0";

  // 🔥 [새로 추가] 서브 액션(초기화 등)을 위한 세련된 슬레이트 그라데이션 버튼 🔥
  const secondaryBtnClass = cx(
    "bg-gradient-to-r from-slate-200 to-slate-300 text-slate-700 shadow-md hover:from-slate-300 hover:to-slate-400 border-0",
    "bg-gradient-to-r from-slate-700 to-slate-800 text-slate-200 shadow-lg shadow-black/50 hover:from-slate-600 hover:to-slate-700 border-0"
  );

  return (
    <div
      className={`min-h-screen ${cx("bg-[#F4F5F9]", "bg-[#09090B]")} ${cx(
        "text-slate-800",
        "text-gray-100"
      )} pb-12 transition-colors duration-300`}
      style={{ fontFamily: '"Pretendard", sans-serif' }}
    >
      <style>{`
        @import url("https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css");
        .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: ${
          isDark ? "#3F3F46" : "#CBD5E1"
        }; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: ${
          isDark ? "#D946EF" : "#A855F7"
        }; }
      `}</style>

      <header className="pt-10 pb-8 flex flex-col items-center">
        <div className="flex items-center gap-3">
          <Play
            className={`fill-current w-12 h-12 ${cx(
              "text-[#D946EF]",
              "text-[#D946EF] drop-shadow-[0_0_15px_rgba(217,70,239,0.6)]"
            )}`}
          />
          <h1 className="text-[42px] font-black tracking-tighter bg-gradient-to-r from-[#EC4899] to-[#9333EA] bg-clip-text text-transparent">
            JMsTube
          </h1>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-5">
        <div className="flex justify-between items-center mb-6 px-2">
          <div
            className={`flex gap-1.5 ${cx(
              "bg-white",
              "bg-[#18181B]"
            )} p-1.5 rounded-2xl shadow-sm border ${cx(
              "border-slate-200",
              "border-[#27272A]"
            )} transition-colors`}
          >
            <button
              onClick={() => setActiveTab("analysis")}
              className={`flex items-center gap-2 px-7 py-3 rounded-xl text-[15px] font-extrabold transition-all ${
                activeTab === "analysis"
                  ? primaryBtnClass
                  : cx(
                      "text-slate-500 hover:text-slate-800 hover:bg-slate-50",
                      "text-gray-400 hover:text-white hover:bg-[#27272A]"
                    )
              }`}
            >
              <BarChart3 size={18} /> 분석
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`flex items-center gap-2 px-7 py-3 rounded-xl text-[15px] font-extrabold transition-all ${
                activeTab === "history"
                  ? primaryBtnClass
                  : cx(
                      "text-slate-500 hover:text-slate-800 hover:bg-slate-50",
                      "text-gray-400 hover:text-white hover:bg-[#27272A]"
                    )
              }`}
            >
              <History size={18} /> 기록
            </button>
          </div>
          <button
            onClick={() => setActiveTab("settings")}
            className={`flex items-center gap-2 px-7 py-3 rounded-xl text-[15px] font-extrabold transition-all shadow-sm ${
              activeTab === "settings"
                ? primaryBtnClass
                : `${cx(
                    "bg-white text-slate-600 border-slate-200 hover:bg-slate-50",
                    "bg-[#18181B] text-gray-300 border-[#27272A] hover:bg-[#27272A]"
                  )} border`
            }`}
          >
            <Settings size={18} /> 설정
          </button>
        </div>

        <div
          className={`${cx(
            "bg-white",
            "bg-[#18181B]"
          )} rounded-[32px] shadow-2xl border ${cx(
            "border-slate-200",
            "border-[#27272A]"
          )} min-h-[780px] flex flex-col relative overflow-hidden transition-colors`}
        >
          {activeTab === "analysis" && (
            <div className="flex flex-col lg:flex-row flex-1 h-full">
              <aside
                className={`w-full lg:w-[300px] border-r ${cx(
                  "border-slate-200",
                  "border-[#27272A]"
                )} p-6 ${cx(
                  "bg-white",
                  "bg-[#18181B]"
                )} flex flex-col h-full overflow-y-auto custom-scrollbar transition-colors`}
              >
                <div className="mb-8">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search
                        size={18}
                        className={`absolute left-3.5 top-3 ${cx(
                          "text-slate-400",
                          "text-gray-500"
                        )}`}
                      />
                      <input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                        placeholder="키워드 입력"
                        className={`w-full border ${cx(
                          "border-slate-200 bg-slate-50 text-slate-800",
                          "border-[#3F3F46] bg-[#09090B] text-gray-100 placeholder-gray-500"
                        )} rounded-xl py-2.5 pl-10 pr-3 outline-none hover:border-[#D946EF] ${cx(
                          "focus:bg-white",
                          "focus:bg-[#121212]"
                        )} focus:border-[#D946EF] focus:ring-[3px] focus:ring-[#D946EF]/40 text-[15px] font-bold transition-all`}
                      />
                    </div>
                    <button
                      onClick={() => handleSearch()}
                      className={`p-2.5 rounded-xl transition-colors flex items-center justify-center w-12 shrink-0 ${primaryBtnClass}`}
                    >
                      {isSearching ? (
                        <RotateCcw size={18} className="animate-spin" />
                      ) : (
                        <Search size={18} />
                      )}
                    </button>
                  </div>
                </div>

                <div
                  className={`mb-7 border-t ${cx(
                    "border-slate-100",
                    "border-[#27272A]"
                  )} pt-5`}
                >
                  <div className="flex items-center gap-2 mb-5">
                    <Settings size={18} className="text-[#D946EF]" />
                    <h3
                      className={`font-black text-[15px] tracking-wide ${cx(
                        "text-slate-800",
                        "text-white"
                      )}`}
                    >
                      검색 옵션
                    </h3>
                  </div>
                  <div className="space-y-5">
                    <div>
                      <span className={labelStyle}>수량</span>
                      <select
                        value={limit}
                        onChange={(e) => setLimit(e.target.value)}
                        className={inputStyle}
                      >
                        <option value="50">50</option>
                        <option value="100">100</option>
                        <option value="200">200</option>
                        <option value="전체">전체</option>
                        <option value="직접 기입">직접 기입</option>
                      </select>
                      {limit === "직접 기입" && (
                        <input
                          type="number"
                          value={customLimit}
                          onChange={(e) => setCustomLimit(e.target.value)}
                          placeholder="수량 입력"
                          className={`mt-2 ${inputStyle} ${cx(
                            "bg-purple-50/50",
                            "bg-[#D946EF]/10 border-[#D946EF]/30"
                          )}`}
                        />
                      )}
                    </div>

                    <div className="flex gap-3">
                      <div className="flex-1">
                        <span className={labelStyle}>기간</span>
                        <select
                          value={period}
                          onChange={(e) => setPeriod(e.target.value)}
                          className={inputStyle}
                        >
                          <option value="7일">7일</option>
                          <option value="30일">30일</option>
                          <option value="90일">90일</option>
                          <option value="전체">전체</option>
                          <option value="직접 기입">직접 기입</option>
                        </select>
                        {period === "직접 기입" && (
                          <input
                            type="text"
                            value={customPeriod}
                            onChange={(e) => setCustomPeriod(e.target.value)}
                            placeholder="예: 15일"
                            className={`mt-2 ${inputStyle} ${cx(
                              "bg-purple-50/50",
                              "bg-[#D946EF]/10 border-[#D946EF]/30"
                            )}`}
                          />
                        )}
                      </div>

                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-2">
                          <span
                            className={labelStyle}
                            style={{ marginBottom: 0 }}
                          >
                            국가
                          </span>
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isStrict}
                              onChange={(e) => setIsStrict(e.target.checked)}
                              className="accent-[#D946EF] w-4 h-4 rounded-sm"
                            />
                            <span
                              className={`text-[11px] font-bold ${cx(
                                "text-slate-500",
                                "text-gray-400"
                              )}`}
                            >
                              엄격
                            </span>
                          </label>
                        </div>
                        <select
                          value={country}
                          onChange={(e) => setCountry(e.target.value)}
                          className={inputStyle}
                        >
                          <option value="KR">KR</option>
                          <option value="US">US</option>
                          <option value="JP">JP</option>
                          <option value="전체">전체</option>
                          <option value="직접 기입">직접 기입</option>
                        </select>
                        {country === "직접 기입" && (
                          <input
                            type="text"
                            value={customCountry}
                            onChange={(e) => setCustomCountry(e.target.value)}
                            placeholder="예: UK"
                            className={`mt-2 ${inputStyle} uppercase ${cx(
                              "bg-purple-50/50",
                              "bg-[#D946EF]/10 border-[#D946EF]/30"
                            )}`}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  className={`mb-4 border-t ${cx(
                    "border-slate-100",
                    "border-[#27272A]"
                  )} pt-5`}
                >
                  <div className="flex items-center gap-2 mb-5">
                    <Filter size={18} className="text-[#D946EF]" />
                    <h3
                      className={`font-black text-[15px] tracking-wide ${cx(
                        "text-slate-800",
                        "text-white"
                      )}`}
                    >
                      결과 필터
                    </h3>
                  </div>
                  <div className="space-y-5">
                    <div>
                      <span className={labelStyle}>타입</span>
                      <select
                        value={videoType}
                        onChange={(e) => setVideoType(e.target.value)}
                        className={inputStyle}
                      >
                        <option value="전체">전체</option>
                        <option value="쇼츠">쇼츠</option>
                        <option value="롱폼">롱폼</option>
                      </select>
                    </div>

                    <div>
                      <span className={labelStyle}>CII 필터</span>
                      <div className="flex gap-3.5 text-xs font-bold">
                        <label
                          className={`flex items-center gap-1.5 ${cx(
                            "text-emerald-600",
                            "text-[#00FFA3]"
                          )}`}
                        >
                          <input
                            type="checkbox"
                            checked={ciiGreat}
                            onChange={(e) => setCiiGreat(e.target.checked)}
                            className="accent-emerald-500 w-4 h-4"
                          />{" "}
                          Great
                        </label>
                        <label
                          className={`flex items-center gap-1.5 ${cx(
                            "text-amber-500",
                            "text-[#FFD600]"
                          )}`}
                        >
                          <input
                            type="checkbox"
                            checked={ciiGood}
                            onChange={(e) => setCiiGood(e.target.checked)}
                            className="accent-amber-500 w-4 h-4"
                          />{" "}
                          Good
                        </label>
                        <label
                          className={`flex items-center gap-1.5 ${cx(
                            "text-rose-500",
                            "text-[#FF1744]"
                          )}`}
                        >
                          <input
                            type="checkbox"
                            checked={ciiBad}
                            onChange={(e) => setCiiBad(e.target.checked)}
                            className="accent-rose-500 w-4 h-4"
                          />{" "}
                          Bad
                        </label>
                      </div>
                    </div>

                    <div>
                      <span className={labelStyle}>조회수</span>
                      <div className="flex items-center gap-2">
                        <input
                          value={minViews}
                          onChange={(e) => setMinViews(e.target.value)}
                          placeholder="최소"
                          className={`${inputStyle} text-center`}
                        />
                        <span
                          className={`text-xs font-bold ${cx(
                            "text-slate-300",
                            "text-gray-600"
                          )}`}
                        >
                          ~
                        </span>
                        <input
                          value={maxViews}
                          onChange={(e) => setMaxViews(e.target.value)}
                          placeholder="최대"
                          className={`${inputStyle} text-center`}
                        />
                      </div>
                    </div>

                    <div>
                      <span className={labelStyle}>구독자</span>
                      <div className="flex items-center gap-2">
                        <input
                          value={minSubs}
                          onChange={(e) => setMinSubs(e.target.value)}
                          placeholder="최소"
                          className={`${inputStyle} text-center`}
                        />
                        <span
                          className={`text-xs font-bold ${cx(
                            "text-slate-300",
                            "text-gray-600"
                          )}`}
                        >
                          ~
                        </span>
                        <input
                          value={maxSubs}
                          onChange={(e) => setMaxSubs(e.target.value)}
                          placeholder="최대"
                          className={`${inputStyle} text-center`}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-auto flex gap-2 pt-8">
                  <button
                    onClick={() => handleSearch()}
                    className={`flex-1 py-3 rounded-xl font-bold text-sm transition-colors ${primaryBtnClass}`}
                  >
                    ✓ 적용
                  </button>
                  {/* 🔥 초기화 버튼에 secondaryBtnClass 적용! 🔥 */}
                  <button
                    onClick={resetSidebarFilters}
                    className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 transition-colors ${secondaryBtnClass}`}
                  >
                    <RotateCcw size={16} /> 초기화
                  </button>
                </div>
              </aside>

              <section
                className={`flex-1 flex flex-col h-[780px] overflow-hidden relative ${cx(
                  "bg-white",
                  "bg-[#09090B]"
                )}`}
              >
                <div
                  className={`flex items-center justify-between p-4 px-6 border-b transition-colors ${cx(
                    "border-slate-200 bg-slate-50/80",
                    "border-[#27272A] bg-[#18181B]/80"
                  )}`}
                >
                  <div className="flex items-center gap-4">
                    <span
                      className={`font-black flex items-center gap-2 text-lg ${cx(
                        "text-slate-800",
                        "text-white"
                      )}`}
                    >
                      <BarChart3
                        size={20}
                        className="text-[#D946EF] drop-shadow-[0_0_8px_rgba(217,70,239,0.5)]"
                      />{" "}
                      결과: {sortedVideos.length}개
                    </span>
                    <span
                      className={`text-xs font-bold px-3 py-1.5 rounded-lg ${cx(
                        "text-slate-500 bg-slate-200/80",
                        "text-gray-300 bg-[#27272A]"
                      )}`}
                    >
                      필터 없음
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-[13px] font-bold">
                    <div
                      className={`flex p-1 rounded-xl border mr-4 transition-colors ${cx(
                        "bg-slate-100 border-slate-200",
                        "bg-[#09090B] border-[#27272A]"
                      )}`}
                    >
                      <button
                        onClick={() => setViewMode("comfort")}
                        className={`px-4 py-2 rounded-lg transition-all text-xs ${
                          viewMode === "comfort"
                            ? cx(
                                "bg-white text-slate-800 shadow-sm",
                                "bg-[#27272A] text-white shadow-sm"
                              )
                            : cx(
                                "text-slate-500 hover:text-slate-800",
                                "text-gray-500 hover:text-white"
                              )
                        }`}
                      >
                        Comfort
                      </button>
                      <button
                        onClick={() => setViewMode("compact")}
                        className={`px-4 py-2 rounded-lg transition-all text-xs ${
                          viewMode === "compact"
                            ? cx(
                                "bg-white text-slate-800 shadow-sm",
                                "bg-[#27272A] text-white shadow-sm"
                              )
                            : cx(
                                "text-slate-500 hover:text-slate-800",
                                "text-gray-500 hover:text-white"
                              )
                        }`}
                      >
                        Compact
                      </button>
                    </div>

                    {/* 🔥 상단 초기화 버튼들도 secondaryBtnClass 적용! 🔥 */}
                    <button
                      onClick={clearResults}
                      className={`px-5 py-2.5 rounded-xl flex items-center gap-2 transition-colors text-[13px] font-black ${secondaryBtnClass}`}
                    >
                      <Trash2 size={16} /> 초기화
                    </button>

                    <button
                      onClick={handleApiReset}
                      className={`px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-sm text-[13px] font-bold transition-colors ${secondaryBtnClass}`}
                    >
                      <RotateCcw size={16} /> API 초기화
                    </button>
                  </div>
                </div>

                <div
                  className={`flex-1 overflow-auto custom-scrollbar transition-colors ${cx(
                    "bg-slate-50/20",
                    "bg-[#09090B]"
                  )}`}
                >
                  <table className="min-w-full text-left border-collapse whitespace-nowrap">
                    <thead
                      className={`sticky top-0 z-10 shadow-sm transition-colors ${cx(
                        "bg-white",
                        "bg-[#18181B]"
                      )}`}
                    >
                      <tr
                        className={`border-b ${cx(
                          "border-slate-200",
                          "border-[#27272A]"
                        )}`}
                      >
                        <th
                          className={`p-3.5 font-extrabold text-sm text-center w-14 select-none ${cx(
                            "text-slate-500",
                            "text-gray-400"
                          )}`}
                        >
                          #
                        </th>
                        <th
                          className={`p-3.5 font-extrabold text-sm text-center w-36 select-none ${cx(
                            "text-slate-500",
                            "text-gray-400"
                          )}`}
                        >
                          썸네일
                        </th>
                        {renderSortableHeader("제목", "title", "text-left")}
                        {renderSortableHeader("채널", "channel", "text-left")}
                        {renderSortableHeader("조회수", "views", "text-right")}
                        {renderSortableHeader("구독자", "subs", "text-right")}
                        {renderSortableHeader("날짜", "date", "text-center")}
                        {renderSortableHeader(
                          "길이",
                          "duration",
                          "text-center"
                        )}
                        {renderSortableHeader("좋아요", "likes", "text-right")}
                        {renderSortableHeader("댓글", "comments", "text-right")}
                        {renderSortableHeader(
                          "구독/조회",
                          "subViewRatio",
                          "text-right"
                        )}
                        {renderSortableHeader(
                          "좋아요율",
                          "likeRatio",
                          "text-right"
                        )}
                        {renderSortableHeader("CII", "cii", "text-center")}
                        {renderSortableHeader("TYPE", "type", "text-center")}
                      </tr>
                    </thead>
                    <tbody
                      className={`text-sm font-medium transition-colors ${cx(
                        "text-slate-700",
                        "text-gray-300"
                      )}`}
                    >
                      {sortedVideos.length === 0 ? (
                        <tr>
                          <td colSpan="14" className="text-center py-32">
                            <div
                              className={`border rounded-3xl py-16 px-10 max-w-2xl mx-auto shadow-sm transition-colors ${cx(
                                "border-slate-200 bg-slate-50/50",
                                "border-[#27272A] bg-[#18181B]"
                              )}`}
                            >
                              <p
                                className={`text-[15px] font-bold ${cx(
                                  "text-slate-500",
                                  "text-gray-400"
                                )}`}
                              >
                                검색 결과가 없습니다. 상단 검색창에서 키워드를
                                입력해 보세요.
                              </p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        sortedVideos.map((v, i) => {
                          const views = v.statistics?.viewCount || 0;
                          const likes = v.statistics?.likeCount || 0;
                          const comments = v.statistics?.commentCount || 0;
                          const subs = 10000;

                          const highResUrl =
                            v.snippet.thumbnails.maxres?.url ||
                            v.snippet.thumbnails.high?.url ||
                            v.snippet.thumbnails.medium?.url ||
                            v.snippet.thumbnails.default.url;
                          const thumbUrl =
                            v.snippet.thumbnails.medium?.url ||
                            v.snippet.thumbnails.default.url;

                          const decodedTitle = decodeHTMLEntities(
                            v.snippet.title
                          );

                          const viewSubRatio = subs
                            ? (views / subs).toFixed(1) + "x"
                            : "-";
                          const likeRatio = views
                            ? ((likes / views) * 100).toFixed(2) + "%"
                            : "-";
                          const cii = getCIIBadge(likes, views);

                          const type = (
                            v.contentDetails?.duration || ""
                          ).includes("M")
                            ? "롱폼"
                            : "쇼츠";

                          const rowPadding =
                            viewMode === "comfort" ? "py-5" : "py-2.5";

                          return (
                            <tr
                              key={v.exactVideoId || i}
                              className={`border-b transition-colors ${cx(
                                "border-slate-100 bg-white hover:bg-fuchsia-50/40",
                                "border-[#27272A] bg-[#09090B] hover:bg-[#D946EF]/10"
                              )}`}
                            >
                              <td
                                className={`px-3.5 text-center font-bold text-[15px] align-middle ${rowPadding} ${cx(
                                  "text-slate-400",
                                  "text-gray-500"
                                )}`}
                              >
                                {i + 1}
                              </td>

                              <td
                                className={`px-3.5 text-center align-middle ${rowPadding}`}
                              >
                                <div
                                  className="relative group cursor-pointer overflow-hidden rounded-xl shadow-md w-[120px] aspect-video mx-auto shrink-0 flex bg-black"
                                  onClick={() =>
                                    handleThumbnailClick(
                                      highResUrl,
                                      decodedTitle
                                    )
                                  }
                                >
                                  <img
                                    src={thumbUrl}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                    alt="thumb"
                                  />
                                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    <Search
                                      size={24}
                                      className="text-white drop-shadow-md"
                                    />
                                  </div>
                                </div>
                              </td>

                              <td
                                className={`px-3.5 whitespace-normal min-w-[260px] align-middle ${rowPadding}`}
                              >
                                <p
                                  className={`line-clamp-2 leading-relaxed text-[15px] font-black cursor-pointer hover:underline bg-gradient-to-r from-[#EC4899] to-[#9333EA] bg-clip-text text-transparent drop-shadow-sm`}
                                  onClick={() =>
                                    window.open(
                                      `https://www.youtube.com/watch?v=${v.exactVideoId}`,
                                      "_blank"
                                    )
                                  }
                                >
                                  {decodedTitle}
                                </p>
                              </td>

                              <td
                                className={`px-3.5 whitespace-normal min-w-[130px] line-clamp-2 text-[13px] font-bold align-middle ${rowPadding} ${cx(
                                  "text-slate-600",
                                  "text-gray-300"
                                )}`}
                              >
                                {v.snippet.channelTitle}
                              </td>
                              <td
                                className={`px-3.5 text-right font-black text-[15px] align-middle ${rowPadding} ${cx(
                                  "text-slate-800",
                                  "text-gray-100"
                                )}`}
                              >
                                {formatNum(views)}
                              </td>
                              <td
                                className={`px-3.5 text-right font-bold align-middle ${rowPadding}`}
                              >
                                {formatNum(subs)}
                              </td>
                              <td
                                className={`px-3.5 text-center text-[13px] font-semibold tracking-wide align-middle ${rowPadding} ${cx(
                                  "text-slate-500",
                                  "text-gray-400"
                                )}`}
                              >
                                {formatDate(v.snippet.publishedAt)}
                              </td>
                              <td
                                className={`px-3.5 text-center font-black tracking-wider align-middle ${rowPadding}`}
                              >
                                {formatDuration(v.contentDetails?.duration)}
                              </td>
                              <td
                                className={`px-3.5 text-right font-bold align-middle ${rowPadding}`}
                              >
                                {formatNum(likes)}
                              </td>
                              <td
                                className={`px-3.5 text-right font-bold align-middle ${rowPadding}`}
                              >
                                {formatNum(comments)}
                              </td>
                              <td
                                className={`px-3.5 text-right font-black align-middle ${rowPadding}`}
                              >
                                {viewSubRatio}
                              </td>
                              <td
                                className={`px-3.5 text-right font-black align-middle ${rowPadding}`}
                              >
                                {likeRatio}
                              </td>
                              <td
                                className={`px-3.5 text-center text-[14px] align-middle ${rowPadding} ${cii.color}`}
                              >
                                {cii.label}
                              </td>

                              <td
                                className={`px-3.5 text-center text-[15px] font-black tracking-widest align-middle ${rowPadding} ${
                                  type === "쇼츠"
                                    ? cx(
                                        "text-cyan-500",
                                        "text-[#00E5FF] drop-shadow-[0_0_6px_rgba(0,229,255,0.6)]"
                                      )
                                    : cx(
                                        "text-amber-500",
                                        "text-[#FFB300] drop-shadow-[0_0_6px_rgba(255,179,0,0.6)]"
                                      )
                                }`}
                              >
                                {type}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          )}

          {activeTab === "history" && (
            <div
              className={`p-12 flex flex-col h-full transition-colors ${cx(
                "bg-white",
                "bg-[#18181B]"
              )}`}
            >
              <div
                className={`flex items-center justify-between mb-6 border-b pb-6 transition-colors ${cx(
                  "border-slate-100",
                  "border-[#27272A]"
                )}`}
              >
                <h2
                  className={`text-3xl font-black flex items-center gap-3 ${cx(
                    "text-slate-800",
                    "text-white"
                  )}`}
                >
                  <History
                    className="text-[#D946EF] drop-shadow-md"
                    size={30}
                  />{" "}
                  검색 기록
                </h2>
                {searchHistory.length > 0 && (
                  <button
                    onClick={clearHistory}
                    className={`px-6 py-3 rounded-xl text-[15px] font-bold flex items-center gap-2 transition-colors ${primaryBtnClass}`}
                  >
                    <Trash2 size={18} /> 전체 삭제
                  </button>
                )}
              </div>
              <p
                className={`text-[15px] mb-8 p-5 rounded-2xl flex items-center gap-2 font-bold transition-colors ${cx(
                  "text-slate-500 bg-slate-50",
                  "text-gray-300 bg-[#09090B]"
                )}`}
              >
                <AlertCircle size={18} /> 삭제는 저장된 검색 결과만 제거하며
                설정/필터/API 키는 유지됩니다.
              </p>

              {searchHistory.length === 0 ? (
                <div
                  className={`flex-1 flex items-center justify-center font-bold text-xl ${cx(
                    "text-slate-400",
                    "text-gray-500"
                  )}`}
                >
                  기록이 없습니다.
                </div>
              ) : (
                <div className="grid gap-4 content-start">
                  {searchHistory.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        setActiveTab("analysis");
                        handleSearch(item.term);
                      }}
                      className={`flex justify-between items-center p-6 border rounded-2xl cursor-pointer transition-colors shadow-sm group ${cx(
                        "border-slate-200 hover:border-[#D946EF] hover:bg-fuchsia-50",
                        "border-[#27272A] bg-[#09090B] hover:border-[#D946EF] hover:bg-[#D946EF]/10"
                      )}`}
                    >
                      <div className="flex items-center gap-5">
                        <Clock className="text-[#D946EF]" size={24} />
                        <span
                          className={`font-black text-lg ${cx(
                            "text-slate-700",
                            "text-white"
                          )}`}
                        >
                          {item.term}
                        </span>
                      </div>

                      <div className="flex items-center gap-5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteHistoryItem(item.id);
                          }}
                          className={`p-2.5 rounded-xl transition-colors opacity-0 group-hover:opacity-100 ${cx(
                            "text-slate-400 hover:text-rose-500 hover:bg-rose-50",
                            "text-gray-500 hover:text-[#FF1744] hover:bg-rose-900/20"
                          )}`}
                          title="삭제"
                        >
                          <Trash2 size={20} />
                        </button>
                        <span
                          className={`text-[15px] font-bold flex items-center gap-2 ${cx(
                            "text-slate-400",
                            "text-gray-400"
                          )}`}
                        >
                          {item.date} <ChevronRight size={20} />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "settings" && (
            <div
              className={`p-12 flex flex-col h-full items-center pt-28 transition-colors ${cx(
                "bg-white",
                "bg-[#18181B]"
              )}`}
            >
              <div className="w-full max-w-3xl flex flex-col gap-10">
                <div
                  className={`border rounded-[28px] overflow-hidden shadow-2xl transition-colors ${cx(
                    "border-slate-200",
                    "border-[#27272A]"
                  )}`}
                >
                  <div
                    className={`border-b px-10 py-6 flex items-center gap-3 transition-colors ${cx(
                      "bg-slate-50 border-slate-200",
                      "bg-[#09090B] border-[#27272A]"
                    )}`}
                  >
                    <Key className="text-[#D946EF]" size={24} />{" "}
                    <h3
                      className={`font-black text-xl ${cx(
                        "text-slate-800",
                        "text-white"
                      )}`}
                    >
                      API 키 관리
                    </h3>
                  </div>
                  <div
                    className={`p-12 flex flex-col gap-6 ${cx(
                      "bg-white",
                      "bg-[#18181B]"
                    )}`}
                  >
                    <div className="flex justify-between text-lg items-center">
                      <span
                        className={`px-4 py-2 rounded-xl font-black text-[15px] transition-colors ${cx(
                          "bg-rose-50 text-rose-500",
                          "bg-rose-900/20 text-[#FF1744]"
                        )}`}
                      >
                        API 키 발급 방법
                      </span>
                      <span
                        className={`font-black flex items-center gap-2 ${cx(
                          "text-slate-800",
                          "text-white"
                        )}`}
                      >
                        {apiKey ? (
                          <>
                            <CheckCircle2
                              size={24}
                              className={cx(
                                "text-emerald-500",
                                "text-[#00FFA3]"
                              )}
                            />{" "}
                            활성
                          </>
                        ) : (
                          <>
                            <AlertCircle
                              size={24}
                              className={cx("text-rose-500", "text-[#FF1744]")}
                            />{" "}
                            미입력
                          </>
                        )}
                      </span>
                    </div>
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="YouTube Data API v3 키를 입력하세요"
                      className={`w-full border ${cx(
                        "border-slate-300 bg-slate-50 text-slate-800",
                        "border-[#3F3F46] bg-[#09090B] text-gray-100 placeholder-gray-500"
                      )} rounded-2xl py-4 px-6 outline-none hover:border-[#D946EF] ${cx(
                        "focus:bg-white",
                        "focus:bg-[#121212]"
                      )} focus:border-[#D946EF] focus:ring-[4px] focus:ring-[#D946EF]/30 text-lg font-bold transition-all`}
                    />
                    <button
                      onClick={() => {
                        alert("저장 완료!");
                        setActiveTab("analysis");
                      }}
                      className={`py-4 rounded-2xl font-black transition-colors text-lg mt-3 ${primaryBtnClass}`}
                    >
                      저장하기
                    </button>
                  </div>
                </div>

                <div
                  className={`border rounded-[28px] overflow-hidden shadow-2xl transition-colors ${cx(
                    "border-slate-200",
                    "border-[#27272A]"
                  )}`}
                >
                  <div
                    className={`border-b px-10 py-6 flex items-center gap-3 transition-colors ${cx(
                      "bg-slate-50 border-slate-200",
                      "bg-[#09090B] border-[#27272A]"
                    )}`}
                  >
                    <Palette className="text-[#D946EF]" size={24} />{" "}
                    <h3
                      className={`font-black text-xl ${cx(
                        "text-slate-800",
                        "text-white"
                      )}`}
                    >
                      테마 설정
                    </h3>
                  </div>
                  <div
                    className={`p-12 flex items-center justify-between ${cx(
                      "bg-white",
                      "bg-[#18181B]"
                    )}`}
                  >
                    <span
                      className={`font-black text-lg ${cx(
                        "text-slate-700",
                        "text-gray-200"
                      )}`}
                    >
                      어플리케이션 테마
                    </span>
                    <select
                      value={theme}
                      onChange={(e) => setTheme(e.target.value)}
                      className={`w-56 border ${cx(
                        "border-slate-300 bg-slate-50 text-slate-800",
                        "border-[#3F3F46] bg-[#09090B] text-gray-100"
                      )} rounded-2xl py-3.5 px-6 outline-none hover:border-[#D946EF] focus:border-[#D946EF] focus:ring-[4px] focus:ring-[#D946EF]/30 text-lg font-bold transition-all cursor-pointer`}
                    >
                      <option value="Light">Light Mode ☀️</option>
                      <option value="Dark">Dark Mode 🌙</option>
                      <option value="System">System 💻</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div
          className={`mt-6 border rounded-2xl p-5 px-7 flex justify-between items-center text-[15px] font-black shadow-xl transition-all duration-300 ${cx(
            "bg-white border-slate-200",
            "bg-[#18181B] border-[#27272A]"
          )}`}
        >
          <div className="flex items-center gap-3.5">
            <div
              className={`w-3 h-3 rounded-full ${
                statusMsg.includes("초기화") ||
                statusMsg.includes("해제") ||
                statusMsg.includes("에러")
                  ? "bg-[#FF1744] shadow-[0_0_10px_rgba(255,23,68,0.8)]"
                  : "bg-[#00FFA3] animate-pulse shadow-[0_0_10px_rgba(0,255,163,0.8)]"
              }`}
            ></div>
            <span
              className={
                statusMsg.includes("초기화") || statusMsg.includes("해제")
                  ? cx("text-slate-800", "text-white")
                  : cx("text-slate-500", "text-gray-400")
              }
            >
              {statusMsg}
            </span>
          </div>
          <div className="flex items-center gap-2.5 text-[#D946EF] drop-shadow-[0_0_5px_rgba(217,70,239,0.5)]">
            <Play size={18} fill="currentColor" />
            <span className="tracking-wider">JMsTube PRO</span>
          </div>
        </div>
      </main>
    </div>
  );
}
