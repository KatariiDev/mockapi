import { useEffect, useState } from 'react'
import './Table.css'

export default function Table() {
    const [data, setData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({});
    const [selectedIds, setSelectedIds] = useState([]);
    const [isSortASC, setIsSortASC] = useState(true);

    useEffect(() => {
        let isMounted = true;

        const loadData = async () => {
            try {
                const response = await fetch('https://671891927fc4c5ff8f49fcac.mockapi.io/v2')

                if (!response.ok) {
                    throw new Error('Không thể lấy dữ liệu');
                }

                const result = await response.json();
                if (!Array.isArray(result)) {
                    throw new Error('Dữ liệu nhận được không phải là một mảng');
                }

                if (isMounted) {
                    setData(currentData => JSON.stringify(currentData) === JSON.stringify(result)
                        ? currentData
                        : result);
                    setError('');
                    setIsLoading(false);
                }
            } catch {
                if (isMounted) {
                    setError('Lỗi lấy dữ liệu');
                    setIsLoading(false);
                }
            }
        };

        loadData();
        const refreshTimer = setInterval(loadData, 5000);

        return () => {
            isMounted = false;
            clearInterval(refreshTimer);
        };
    }, [])

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
        fetch('https://671891927fc4c5ff8f49fcac.mockapi.io/v2', {
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
            .then(newUser => {
                setData([...data, newUser]);
                setFormData({});
                alert("Thêm thành công!");
            })
            .catch((e) => {
                console.log(e)
            })
    }

    const handleClickArrange = () => {
        setIsSortASC(!isSortASC);
        if (isSortASC) {
            fetch('https://671891927fc4c5ff8f49fcac.mockapi.io/v2', {
                headers: 'PUT'
            })
        }
    }

    const handleDelete = async () => {
        if (selectedIds.length === 0) {
            alert("Vui lòng chọn user cần xóa");
            return;
        }

        const idsToDelete = [...selectedIds];
        const deletedIds = [];

        for (const id of idsToDelete) {
            try {
                const response = await fetch(`https://671891927fc4c5ff8f49fcac.mockapi.io/v2/${id}`, {
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
                    <button className='buttonSort' onClick={handleClickArrange}>{(isSortASC) ? 'ID tăng dần' : 'ID giảm dần'}</button>
                    <button className='buttonSearch'>Tìm User</button>
                    {/*
                        1. Cho phép select xóa
                        2. button Update
                        3. button sort ASC/DESC
                        5. Search
                        6. Pagination
                    */}
                </div>
            </div>

            {isLoading && <p>Đang tải dữ liệu...</p>}
            {/* {error && <p>{error}</p>} */}
            {!isLoading && !error && data.length === 0 && <p>Không có dữ liệu.</p>}
            {
                (!isLoading && !error && data.length > 0) && (
                    <table border={1} >
                        <thead>
                            <tr>
                                <th>selected:{selectedIds.length}</th>
                                {displayColumns.map((key) => (
                                    <th key={key}>{key}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((item) => (
                                <tr key={item.id} style={{ backgroundColor: item.color, color: '#393939' }}>
                                    <td>
                                        <input
                                            type="checkbox"
                                            // aria-label={`Chọn user ${item.id}`}
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
                        </tbody>
                    </table>
                )
            }
        </div >
    )
}