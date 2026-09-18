import { useEffect, useState } from 'react'
import './Table.css'

export default function Table() {
    const [data, setData] = useState([]);
    const [isClick, setIsClick] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [isDisplay, setIsDisplay] = useState(false);
    const [isDisplayDel, setIsDisplayDel] = useState(false);
    const [formData, setFormData] = useState({});
    const [selectedId, setSelectedId] = useState('');

    useEffect(() => {
        fetch('https://671891927fc4c5ff8f49fcac.mockapi.io/v2')
            .then(res => { return res.json() })
            .then(result => {
                if (!Array.isArray(result)) {
                    throw new Error('Dữ liệu nhận được không phải là một mảng');
                }
                setData(result);
            })
            .catch(() => {
                setError('Lỗi lấy dữ liệu');
            })
            .finally(() => {
                setIsLoading(false);
            })
    }, [])

    const handleClickTable = () => {
        setIsClick(!isClick);
    }

    const displayCreate = () => {
        setIsDisplay(!isDisplay);
    }

    const displayDel = () => {
        setIsDisplayDel(!isDisplayDel);
    }

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
                console.log("newUser: " + newUser);

                setData([...data, newUser]);
                setFormData({});
                alert("Thêm thành công!");
                setIsDisplay(false)
            })
            .catch((e) => {
                console.log(e)
            })
    }

    const handleSelectId = (e) => {
        setSelectedId(e.target.value);
    }

    const handleDelete = () => {
        if (!selectedId) {
            alert("Vui lòng chọn ID cần xóa");
            return;
        }

        const option = {
            method: 'DELETE'
        }

        fetch(`https://671891927fc4c5ff8f49fcac.mockapi.io/v2/${selectedId}`, option)
            .then(res => {
                if (!res.ok) {
                    throw new Error('Không thể xóa user');
                }

                return res.json();
            })
            .then(() => {
                setData(data.filter(item => item.id !== selectedId));
                setSelectedId('');
                alert("Xóa thành công!");
                setIsDisplayDel(false);
            })
            .catch(error => {
                console.log(error)
            })
    }

    return (
        <div className="table">
            <button onClick={handleClickTable} className='buttonTable'>{isClick ? 'Xóa bảng dữ liệu' : 'Xuất bảng dữ liệu'}</button>

            <div className="buttonCRUD">
                <button onClick={displayCreate} className='buttonCreate'>Tạo user</button>
                <button className="buttonDel" onClick={displayDel}>Xóa User</button>
            </div>
            {isDisplay && (
                <div className="createContainer">
                    <div className="create">
                        {Object.keys(data[0] || {}).map((key) => (
                            <div className="formField" key={key}>
                                <label htmlFor={key}>{formatKey(key)}</label>
                                <input id={key} type="text" placeholder={formatKey(key)} value={formData[key] || ''} onChange={handleChange} />
                            </div>
                        ))}
                        <div className='interactForm'>
                            <button className="backButton" onClick={() => setIsDisplay(false)}>Trở về</button>
                            <button className="createButton" onClick={handleCreate}>Thêm</button>
                        </div>
                    </div>
                </div>
            )}

            {isDisplayDel && (
                <div className="delContainer">
                    <div className="del">
                        <div className="formDel">
                            <label htmlFor="id">Chọn ID cần xóa</label>
                            <select value={selectedId} onChange={handleSelectId}>
                                <option value="">{('---Chọn ID cần xóa---')}</option>
                                {data.map((item) => (
                                    <option value={item.id} key={item.id}>
                                        {('id: ' + item.id + ' - name: ' + item.name)}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className='interactForm'>
                            <button className="backButton" onClick={() => setIsDisplayDel(false)}>Trở về</button>
                            <button className="delButton" onClick={handleDelete}>Xác nhận xóa</button>
                        </div>
                    </div>
                </div>
            )}


            {isClick && isLoading && <p>Đang tải dữ liệu...</p>}
            {isClick && error && <p>{error}</p>}
            {isClick && !isLoading && !error && data.length === 0 && <p>Không có dữ liệu.</p>}
            {(isClick && !isLoading && !error && data.length > 0) && (
                <table border={1} >
                    <thead>
                        <tr>
                            {Object.keys(data[0]).map((key) => (
                                <th key={key}>{key}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((item) => (
                            <tr key={item.id}>
                                {Object.keys(data[0]).map((key) => (
                                    <td key={key}>
                                        {(typeof item[key] === 'object') ?
                                            JSON.stringify(item[key]) :
                                            item[key]
                                        }
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div >
    )
}