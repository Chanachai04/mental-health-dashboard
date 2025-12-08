import { useState, useEffect, useMemo, useCallback } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import { format, parseISO, subMonths } from "date-fns";
import { th } from "date-fns/locale"; // Import Thai locale for date-fns
import { Calendar, Search } from "lucide-react"; // Using lucide-react for icons

// Base URL for your backend API
const API_BASE_URL = "http://localhost:5151/api"; // Make sure this matches your backend server's address

// Colors for charts
const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#A28DFF",
  "#FF6B6B",
  "#6BFFB8",
  "#FFD16B",
  "#6BB8FF",
  "#FF6BB8",
];

// API Integration Function
const api = {
  getPosts: async ({ startDate, endDate, platform, searchTerm }) => {
    // Construct query parameters
    const params = new URLSearchParams();
    if (startDate) {
      params.append("startDate", format(startDate, "yyyy-MM-dd"));
    }
    if (endDate) {
      params.append("endDate", format(endDate, "yyyy-MM-dd"));
    }
    if (platform && platform !== "ทั้งหมด") {
      params.append("platform", platform);
    }
    if (searchTerm) {
      params.append("searchTerm", searchTerm);
    }

    const url = `${API_BASE_URL}/posts?${params.toString()}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      // Convert createAt string to Date object for frontend processing
      return data.map((post) => ({
        ...post,
        createAt: parseISO(post.createAt),
      }));
    } catch (error) {
      console.error("Error fetching data from API:", error);
      throw error; // Re-throw to be caught by the calling function
    }
  },
};

function App() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(subMonths(new Date(), 1)); // Default: last month
  // const [endDate, setEndDate] = useState(new Date()); // Default: today
  const [endDate, setEndDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  });
  const [selectedPlatform, setSelectedPlatform] = useState("ทั้งหมด");
  // eslint-disable-next-line no-unused-vars
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState(null); // State to hold error messages

  // Pagination states for latest posts table
  const [currentPage, setCurrentPage] = useState(1);
  const [postsPerPage, setPostsPerPage] = useState(10); // Changed to state

  // Fetch data based on filters
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null); // Clear previous errors
    setCurrentPage(1); // Reset to first page on new data fetch
    try {
      const fetchedPosts = await api.getPosts({
        startDate,
        endDate,
        platform: selectedPlatform,
        searchTerm,
      });
      setPosts(fetchedPosts);
    } catch (err) {
      console.error("Failed to fetch data:", err);
      setError(
        "ไม่สามารถดึงข้อมูลได้ โปรดตรวจสอบการเชื่อมต่อ API หรือลองใหม่อีกครั้ง"
      ); // User-friendly error message
      setPosts([]); // Clear posts on error
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, selectedPlatform, searchTerm]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Derived data for dashboard metrics
  const totalPosts = useMemo(() => posts.length, [posts]);

  const postsByTime = useMemo(() => {
    const dailyCounts = {};
    posts.forEach((post) => {
      const dateKey = format(post.createAt, "yyyy-MM-dd");
      dailyCounts[dateKey] = (dailyCounts[dateKey] || 0) + 1;
    });
    return Object.keys(dailyCounts)
      .sort()
      .map((date) => ({
        date: format(parseISO(date), "dd MMM", { locale: th }),
        count: dailyCounts[date],
      }));
  }, [posts]);

  const postsByPlatform = useMemo(() => {
    const platformCounts = {};
    posts.forEach((post) => {
      platformCounts[post.platform] = (platformCounts[post.platform] || 0) + 1;
    });
    return Object.keys(platformCounts).map((platform) => ({
      name: platform,
      value: platformCounts[platform],
    }));
  }, [posts]);

  const topUsers = useMemo(() => {
    const userCounts = {};
    posts.forEach((post) => {
      userCounts[post.username] = (userCounts[post.username] || 0) + 1;
    });
    return Object.entries(userCounts)
      .sort(([, countA], [, countB]) => countB - countA)
      .slice(0, 10)
      .map(([username, count]) => ({ username, count }));
  }, [posts]);

  // Pagination logic for latest posts table
  const sortedPosts = useMemo(() => {
    return [...posts].sort(
      (a, b) => b.createAt.getTime() - a.createAt.getTime()
    );
  }, [posts]);

  const indexOfLastPost = currentPage * postsPerPage;
  const indexOfFirstPost = indexOfLastPost - postsPerPage;
  const currentPaginatedPosts = sortedPosts.slice(
    indexOfFirstPost,
    indexOfLastPost
  );

  const totalPages = Math.ceil(sortedPosts.length / postsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Handle posts per page change
  const handlePostsPerPageChange = (e) => {
    setPostsPerPage(Number(e.target.value));
    setCurrentPage(1); // Reset to first page when changing posts per page
  };

  // Updated pagination items generation
  const generatePaginationItems = () => {
    const items = [];
    const maxVisiblePages = 8;

    if (totalPages <= maxVisiblePages) {
      // Show all pages if 8 or fewer
      for (let i = 1; i <= totalPages; i++) {
        items.push(i);
      }
    } else {
      // Always show first page
      items.push(1);

      // Calculate start and end of visible range
      let start = Math.max(2, currentPage - 3);
      let end = Math.min(totalPages - 1, currentPage + 3);

      // Adjust range to always show 8 pages
      const visibleRange = end - start + 1;
      if (visibleRange < 6) {
        if (start === 2) {
          end = Math.min(totalPages - 1, start + 5);
        } else if (end === totalPages - 1) {
          start = Math.max(2, end - 5);
        }
      }

      // Add ellipsis before visible range if needed
      if (start > 2) {
        items.push("...");
      }

      // Add visible pages
      for (let i = start; i <= end; i++) {
        items.push(i);
      }

      // Add ellipsis after visible range if needed
      if (end < totalPages - 1) {
        items.push("...");
      }

      // Always show last page (if not already shown)
      if (totalPages > 1) {
        items.push(totalPages);
      }
    }

    return items;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100  text-gray-900 ">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
        <p className="ml-4 text-lg">กำลังโหลดข้อมูล...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100  text-gray-900  p-6 font-inter">
      <header className="mb-8 p-4 bg-white  rounded-xl shadow-md">
        <div className="flex flex-col items-center justify-center my-8 text-center">
          <img
            src="/images/Mahidol_U.png"
            alt="Mahidol University"
            className="w-[100px] sm:w-[150px] h-[100px] sm:h-[150px]"
          />
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mt-2">
            Mahidol University
          </h1>
          <p className="text-base sm:text-xl text-gray-600 mt-2 ">
            Application of Natural Language Processing to Study the Impact of
            Social Media on Mental Health in Children And Adolescents
          </p>
        </div>
      </header>

      {/* Filters Section */}
      <section className="mb-8 p-6 bg-white  rounded-xl shadow-md flex flex-wrap items-center justify-center gap-4">
        <div className="flex items-center gap-2">
          <Calendar className="text-gray-500 " size={20} />
          <label htmlFor="startDate" className="text-sm font-medium">
            จาก:
          </label>
          <input
            type="date"
            id="startDate"
            value={format(startDate, "yyyy-MM-dd")}
            onChange={(e) => setStartDate(parseISO(e.target.value))}
            className="p-2 border border-gray-300  rounded-md bg-gray-50  text-gray-900  focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="endDate" className="text-sm font-medium">
            ถึง:
          </label>
          <input
            type="date"
            id="endDate"
            value={format(endDate, "yyyy-MM-dd")}
            onChange={(e) => setEndDate(parseISO(e.target.value))}
            className="p-2 border border-gray-300  rounded-md bg-gray-50  text-gray-900  focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="platformFilter" className="text-sm font-medium">
            แพลตฟอร์ม:
          </label>
          <select
            id="platformFilter"
            value={selectedPlatform}
            onChange={(e) => setSelectedPlatform(e.target.value)}
            className="p-2 border border-gray-300  rounded-md bg-gray-50  text-gray-900  focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ทั้งหมด">ทั้งหมด</option>
            <option value="facebook">Facebook</option>
            <option value="instagram">Instagram</option>
            <option value="twitter">X</option>
            <option value="tiktok">TikTok</option>
          </select>
        </div>
        {/* <div className="flex items-center gap-2 flex-grow">
          <Search className="text-gray-500 dark:text-gray-400" size={20} />
          <label htmlFor="searchTerm" className="sr-only">
            ค้นหาข้อความ:
          </label>
          <input
            type="text"
            id="searchTerm"
            placeholder="ค้นหาข้อความ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div> */}
      </section>

      {error && (
        <div className="mb-4 p-4 bg-red-100  text-red-700  rounded-xl shadow-md text-center">
          <p>{error}</p>
        </div>
      )}

      {/* Overview Section */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="p-6 bg-white  rounded-xl shadow-md flex flex-col items-center justify-center">
          <h2 className="text-xl font-semibold text-gray-700  mb-2">
            จำนวนโพสต์รวม
          </h2>
          <p className="text-5xl font-bold text-blue-600 ">{totalPosts}</p>
        </div>

        <div className="p-6 bg-white  rounded-xl shadow-md col-span-1 md:col-span-2">
          <h2 className="text-xl font-semibold text-gray-700  mb-4">
            แนวโน้มการโพสต์ตามช่วงเวลา
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={postsByTime}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis dataKey="date" stroke="#666" />
              <YAxis stroke="#666" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(255,255,255,0.9)",
                  border: "1px solid #ccc",
                  borderRadius: "8px",
                  padding: "10px",
                }}
                labelStyle={{ color: "#333" }}
                itemStyle={{ color: "#333" }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#8884d8"
                activeDot={{ r: 8 }}
                name="จำนวนโพสต์"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="p-6 bg-white  rounded-xl shadow-md">
          <h2 className="text-xl font-semibold text-gray-700  mb-4">
            แพลตฟอร์มยอดนิยม
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={postsByPlatform}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) =>
                  `${name} ${(percent * 100).toFixed(0)}%`
                }
              >
                {postsByPlatform.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(255,255,255,0.9)",
                  border: "1px solid #ccc",
                  borderRadius: "8px",
                  padding: "10px",
                }}
                labelStyle={{ color: "#333" }}
                itemStyle={{ color: "#333" }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="p-6 bg-white  rounded-xl shadow-md col-span-1 md:col-span-2 lg:col-span-1">
          <h2 className="text-xl font-semibold text-gray-700  mb-4">
            ผู้ใช้งานที่มีการโพสต์มากที่สุด (10 อันดับแรก)
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={topUsers}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis type="number" stroke="#666" />
              <YAxis
                type="category"
                dataKey="username"
                stroke="#666"
                width={80}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(255,255,255,0.9)",
                  border: "1px solid #ccc",
                  borderRadius: "8px",
                  padding: "10px",
                }}
                labelStyle={{ color: "#333" }}
                itemStyle={{ color: "#333" }}
              />
              <Legend />
              <Bar
                dataKey="count"
                fill="#82ca9d"
                name="จำนวนโพสต์"
                radius={[10, 10, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Latest Posts Table */}
      <section className="mb-8 p-6 bg-white  rounded-xl shadow-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-700 ">รายการโพสต์</h2>
          <div className="flex items-center gap-2">
            <label
              htmlFor="postsPerPage"
              className="text-sm font-medium text-gray-700 "
            >
              แสดง:
            </label>
            <select
              id="postsPerPage"
              value={postsPerPage}
              onChange={handlePostsPerPageChange}
              className="p-2 border border-gray-300  rounded-md bg-gray-50  text-gray-900  focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={30}>30</option>
            </select>
            <span className="text-sm text-gray-700 ">รายการต่อหน้า</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 ">
            <thead className="bg-gray-50 ">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500  uppercase tracking-wider rounded-tl-md"
                >
                  วันที่
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500  uppercase tracking-wider"
                >
                  ชื่อผู้ใช้
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500  uppercase tracking-wider"
                >
                  แพลตฟอร์ม
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500  uppercase tracking-wider"
                >
                  ข้อความ
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500  uppercase tracking-wider rounded-tr-md"
                >
                  ลิงก์
                </th>
              </tr>
            </thead>
            <tbody className="bg-white  divide-y divide-gray-200 ">
              {currentPaginatedPosts.length > 0 ? (
                currentPaginatedPosts.map((post, index) => (
                  <tr
                    key={index}
                    className="hover:bg-gray-50  transition-colors duration-200"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 ">
                      {format(post.createAt, "dd/MM/yyyy HH:mm", {
                        locale: th,
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 ">
                      {post.username}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 ">
                      {post.platform}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900  max-w-xs truncate">
                      {post.caption}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600  hover:underline">
                      <a
                        href={post.baseurl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        ดูโพสต์
                      </a>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="5"
                    className="px-6 py-4 text-center text-sm text-gray-500 "
                  >
                    ไม่พบข้อมูลโพสต์ในช่วงเวลาที่เลือกหรือตามตัวกรอง
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <nav className="flex justify-center mt-4" aria-label="Pagination">
            <ul className="inline-flex items-center -space-x-px">
              <li>
                <button
                  onClick={prevPage}
                  disabled={currentPage === 1}
                  className="px-3 py-2 ml-0 leading-tight text-gray-500 bg-white border border-gray-300 rounded-l-lg hover:bg-gray-100 hover:text-gray-700  disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ก่อนหน้า
                </button>
              </li>
              {generatePaginationItems().map((item, index) => (
                <li key={index}>
                  {item === "..." ? (
                    <span className="px-3 py-2 leading-tight text-gray-500 bg-white border border-gray-300 ">
                      ...
                    </span>
                  ) : (
                    <button
                      onClick={() => paginate(item)}
                      className={`px-3 py-2 leading-tight ${
                        currentPage === item
                          ? "text-blue-600 bg-blue-50 border border-blue-300 "
                          : "text-gray-500 bg-white border border-gray-300 hover:bg-gray-100 hover:text-gray-700 "
                      }`}
                    >
                      {item}
                    </button>
                  )}
                </li>
              ))}
              <li>
                <button
                  onClick={nextPage}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 leading-tight text-gray-500 bg-white border border-gray-300 rounded-r-lg hover:bg-gray-100 hover:text-gray-700  disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ถัดไป
                </button>
              </li>
            </ul>
          </nav>
        )}
      </section>

      <footer className="text-center text-gray-500  text-sm mt-8">
        <p>Dashboard</p>
      </footer>
    </div>
  );
}

export default App;
