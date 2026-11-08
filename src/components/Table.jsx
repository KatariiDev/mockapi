import { useCallback, useEffect, useRef, useState } from 'react'
import './Table.css'

const API_URL = 'https://671891927fc4c5ff8f49fcac.mockapi.io/v2';
const PAGE_SIZE = 10;

const ROW_HEIGHT = 72;
const VIEWPORT_HEIGHT = 600;
const OVERSCAN = 5;
const SORTABLE_COLUMNS = ['id', 'name', 'createdAt'];

export default function Table() {
    const [data, setData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);       // đang tải trang đầu
    const [isLoadingMore, setIsLoadingMore] = useState(false); // đang tải thêm khi lướt
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({});
    const [selectedIds, setSelectedIds] = useState([]);

    const pageRef = useRef(1);
    const [hasMore, setHasMore] = useState(true);
    const [searchInput, setSearchInput] = useState('');       // ô search gõ gì hiện nấy
    const [debouncedSearch, setDebouncedSearch] = useState(''); // giá trị search thật sự đem đi fetch
    const lastFetchedSearchRef = useRef(''); // search đã fetch lần cuối (để debounce không fetch trùng lúc mới mở trang)
    const [sortBy, setSortBy] = useState('id');
    const [sortOrder, setSortOrder] = useState('asc');
    const sentinelRef = useRef(null); // div "canh gác" ở cuối bảng cho infinite scroll
    const viewportRef = useRef(null); // khung cuộn của bảng (div.tableViewport)
    const [scrollTop, setScrollTop] = useState(0); // vị trí cuộn trong khung

    const resetToTop = () => {
        viewportRef.current?.scrollTo(0, 0);
        setScrollTop(0);
    };
    const handleScroll = (e) => setScrollTop(e.currentTarget.scrollTop);
    const loadPage = useCallback(async (pageToLoad, {
        reset = false,
        search = debouncedSearch,
        sort = sortBy,
        order = sortOrder,
    } = {}) => {
        try {
            const params = new URLSearchParams({
                page: String(pageToLoad),
                limit: String(PAGE_SIZE),
                sortBy: sort,
                order,
            });
            if (search.trim()) {
                params.set('search', search.trim());
            }

            const response = await fetch(`${API_URL}?${params.toString()}`);
            if (!response.ok) {
                throw new Error('Không thể lấy dữ liệu');
            }

            const result = await response.json();
            if (!Array.isArray(result)) {
                throw new Error('Dữ liệu nhận được không phải là một mảng');
            }

            setData((currentData) => {
                const merged = reset ? result : [...currentData, ...result];
                // Khử trùng theo id: StrictMode ở dev chạy effect 2 lần,
                // không có bước này thì 10 record đầu sẽ hiện 2 lần.
                return [...new Map(merged.map((item) => [String(item.id), item])).values()];
            });
            setHasMore(result.length === PAGE_SIZE);
            setError('');
        } catch {
            setError('Lỗi lấy dữ liệu');
            if (reset) setHasMore(false);
        } finally {
            setIsLoading(false);
            setIsLoadingMore(false);
        }
    }, [debouncedSearch, sortBy, sortOrder]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchInput === lastFetchedSearchRef.current) return;
            lastFetchedSearchRef.current = searchInput;
            setDebouncedSearch(searchInput);
            setIsLoading(true);
            pageRef.current = 1;
            resetToTop();
            loadPage(1, { reset: true, search: searchInput });
        }, 400);
        return () => clearTimeout(timer);
        // Chỉ chạy khi searchInput đổi; loadPage là hàm ổn định theo filter
    }, [searchInput]);

    // Mở trang: tải trang 1. isLoading đã là true từ useState(true) nên
    // không cần set thêm trước fetch.
    useEffect(() => {
        loadPage(1, { reset: true });
    }, []);

    // Lướt xuống -> tải trang tiếp theo nối vào cuối.
    const handleLoadMore = () => {
        if (!hasMore || isLoading || isLoadingMore) return;
        setIsLoadingMore(true);
        pageRef.current += 1;
        loadPage(pageRef.current, { reset: false });
    };
    useEffect(() => {
        const sentinel = sentinelRef.current;
        const viewport = viewportRef.current;
        if (!sentinel || !viewport) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    handleLoadMore();
                }
            },
            { root: viewport, rootMargin: '100px' }
        );
        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [hasMore, isLoading, isLoadingMore]);

    const formatKey = (key) => {
        return key
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, (char) => char.toUpperCase());
    };

    const handleChange = (e) => {
        const { id, value } = e.target;

        setFormData({
            ...formData,
            [id]: value
        });
    };

    const handleCreate = () => {
        fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-type': 'application/json'
            },
            body: JSON.stringify(formData)
        })
            .then(res => {
                if (!res.ok) {
                    throw new Error("Không thể tạo user");
                }
                return res.json();
            })
            .then(() => {
                setFormData({});
                alert("Thêm thành công!");
                // Tải lại trang 1 để user mới hiện đúng vị trí theo sort hiện tại
                setIsLoading(true);
                pageRef.current = 1;
                resetToTop();
                loadPage(1, { reset: true });
            })
            .catch((e) => {
                console.log(e)
            })
    }

    const handleSort = (key) => {
        const nextSortBy = key;
        const nextSortOrder = sortBy === key
            ? (sortOrder === 'asc' ? 'desc' : 'asc')
            : 'asc';
        setSortBy(nextSortBy);
        setSortOrder(nextSortOrder);
        setIsLoading(true);
        pageRef.current = 1;
        resetToTop();
        loadPage(1, { reset: true, sort: nextSortBy, order: nextSortOrder });
    };

    const sortIcon = (key) => {
        if (sortBy !== key) return '';
        return sortOrder === 'asc' ? ' ▲' : ' ▼';
    };

    const handleRefresh = () => {
        setIsLoading(true);
        pageRef.current = 1;
        resetToTop();
        loadPage(1, { reset: true });
    };

    const handleDelete = async () => {
        if (selectedIds.length === 0) {
            alert("Vui lòng chọn user cần xóa");
            return;
        }

        const idsToDelete = [...selectedIds];
        const deletedIds = [];

        for (const id of idsToDelete) {
            try {
                const response = await fetch(`${API_URL}/${id}`, {
                    method: 'DELETE'
                });

                if (!response.ok) {
                    throw new Error('Không thể xóa user');
                }

                deletedIds.push(id);
            } catch (error) {
                console.log(error);
            }
        }

        if (deletedIds.length > 0) {
            setData(currentData => currentData.filter(item => !deletedIds.includes(String(item.id))));
            setSelectedIds(currentIds => currentIds.filter(id => !deletedIds.includes(id)));
            setFormData({});
        }

        alert("Xóa thành công " + deletedIds.length + (deletedIds.length === 1 ? " user!" : " users!"));
    }

    const columns = [...new Set(data.flatMap((item) => Object.keys(item)))]
        .filter((key) => key !== 'id');
    const displayColumns = ['id', ...columns];

    const formatDateTime = (value) => {
        const date = new Date(value);

        return date.toLocaleString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    const formFields = displayColumns
        .filter((key) => !['id', 'createdAt', 'createDate'].includes(key));

    const handleSelect = (id) => {
        const normalizedId = String(id);
        const nextSelectedIds = selectedIds.includes(normalizedId)
            ? selectedIds.filter(selectedId => selectedId !== normalizedId)
            : [...selectedIds, normalizedId];

        setSelectedIds(nextSelectedIds);

        if (nextSelectedIds.length !== 1) {
            setFormData({});
            return;
        }

        const selectedUser = data.find((item) => String(item.id) === nextSelectedIds[0]);
        const selectedUserData = Object.fromEntries(
            formFields.map((key) => [
                key,
                typeof selectedUser[key] === 'object' && selectedUser[key] !== null
                    ? JSON.stringify(selectedUser[key])
                    : selectedUser[key] ?? ''
            ])
        );

        setFormData(selectedUserData);
    };

    const handleUpdate = async () => {
        if (selectedIds.length !== 1) {
            alert('Chọn đúng 1 user cần cập nhật');
            return;
        }
        const id = selectedIds[0];
        try {
            const response = await fetch(`${API_URL}/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
            if (!response.ok) {
                throw new Error('Không thể cập nhật user');
            }
            const updatedUser = await response.json();
            // Đổi luôn trong list đang hiện, khỏi tải lại trang
            setData((currentData) =>
                currentData.map((item) =>
                    String(item.id) === String(id) ? updatedUser : item
                )
            );
            alert('Cập nhật thành công!');
        } catch (error) {
            console.log(error);
            alert('Cập nhật thất bại, kiểm tra mạng rồi thử lại');
        }
    };

    const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
    const visibleCount = Math.ceil(VIEWPORT_HEIGHT / ROW_HEIGHT) + OVERSCAN * 2;
    const endIndex = Math.min(data.length, startIndex + visibleCount);
    const visibleData = data.slice(startIndex, endIndex);
    const topSpacerHeight = startIndex * ROW_HEIGHT;
    const bottomSpacerHeight = (data.length - endIndex) * ROW_HEIGHT;

    return (
        <div className="table">
            <div className="utilSection">
                <div className="tableMain">
                    {formFields.map((key) => (
                        <div className="formField" key={key} >
                            <label htmlFor={key}>{formatKey(key)}</label>
                            <input id={key} type="text" placeholder={formatKey(key)} value={formData[key] || ''} onChange={handleChange} />
                        </div>
                    ))}
                </div>
                <div className="buttonUtil">
                    <button onClick={handleCreate} className='buttonCreate'>Tạo User</button>
                    <button className="buttonDel" onClick={handleDelete}>Xóa User</button>
                    <button className='buttonUpdate'>Cập nhật</button>
                    <button className='buttonRefresh' onClick={handleRefresh}>Làm mới</button>
                    <button className='buttonUpdate' onClick={handleUpdate}>Cập nhật</button>
                </div>
                <div className="searchBox">
                    <input
                        type="text"
                        className="searchInput"
                        placeholder="Tìm user theo tên, email, công ty..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                    />
                </div>
            </div>

            {isLoading && <p>Đang tải dữ liệu...</p>}
            {error && !isLoading && (
                <div>
                    <p>{error}</p>
                    <button onClick={handleRefresh}>Thử lại</button>
                </div>
            )}
            {!isLoading && !error && data.length === 0 && <p>Không tìm thấy user nào.</p>}
            {
                (!isLoading && !error && data.length > 0) && (
                    <div className="tableViewport" ref={viewportRef} onScroll={handleScroll}>
                        <table border={1} >
                            <thead>
                                <tr>
                                    <th>selected:{selectedIds.length}</th>
                                    {displayColumns.map((key) => (
                                        SORTABLE_COLUMNS.includes(key) ? (
                                            <th
                                                key={key}
                                                className="sortHeader"
                                                onClick={() => handleSort(key)}
                                                title="Bấm để đổi chiều sắp xếp"
                                            >
                                                {key}{sortIcon(key)}
                                            </th>
                                        ) : (
                                            <th key={key}>{key}</th>
                                        )
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {topSpacerHeight > 0 && (
                                    <tr className="spacerRow" aria-hidden="true">
                                        <td colSpan={displayColumns.length + 1} style={{ height: topSpacerHeight }} />
                                    </tr>
                                )}
                                {visibleData.map((item) => (
                                    <tr key={item.id} className="dataRow" style={{ backgroundColor: item.color, color: '#393939' }}>
                                        <td>
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.includes(String(item.id))}
                                                onChange={() => handleSelect(item.id)}
                                            />
                                        </td>
                                        {displayColumns.map((key) => (
                                            (key == 'avatar') ?
                                                <td key={key}>
                                                    <img src={item.avatar} alt="" className='imgAvt' />
                                                </td>
                                                :
                                                <td key={key}>
                                                    {key === 'createdAt' || key === 'dob'
                                                        ? formatDateTime(item[key])
                                                        : typeof item[key] === 'object'
                                                            ? JSON.stringify(item[key])
                                                            : item[key]
                                                    }
                                                </td>
                                        ))}
                                    </tr>
                                ))}
                                {bottomSpacerHeight > 0 && (
                                    <tr className="spacerRow" aria-hidden="true">
                                        <td colSpan={displayColumns.length + 1} style={{ height: bottomSpacerHeight }} />
                                    </tr>
                                )}
                            </tbody>
                        </table>

                        {hasMore ? (
                            <div ref={sentinelRef} className="sentinel">
                                {isLoadingMore
                                    ? <p>Đang tải thêm 10 user...</p>
                                    : <button onClick={handleLoadMore}>Tải thêm</button>}
                            </div>
                        ) : (
                            <p className="endMessage">Đã tải hết {data.length} user.</p>
                        )}
                    </div>
                )
            }
        </div >
    )
}
