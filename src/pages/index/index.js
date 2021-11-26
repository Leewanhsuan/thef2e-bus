import '../../style/main.css';
import { GetAuthorizationHeader } from '../../utils/commonApi';
import 'core-js/stable';
import 'regenerator-runtime/runtime';

/**
 * 頁面載入處理事件
 */

let map;

window.addEventListener('load', () => {
    initialMapData();
    document.getElementById('searchBtn').addEventListener('click', () => searchEvent());
    document.getElementById('go-tab').addEventListener('click', () => searchEvent());
    document.getElementById('back-tab').addEventListener('click', () => searchEvent());
});

/**
 * 初始地圖資料
 */
const initialMapData = () => {
    const [initialLongitude, initialLatitude] = [25.0107036, 121.5040648];
    map = L.map('map').setView([initialLongitude, initialLatitude], 15);
    L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
        attribution: `Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>`,
        maxZoom: 18,
        id: 'mapbox/streets-v11',
        tileSize: 512,
        zoomOffset: -1,
        accessToken: 'pk.eyJ1Ijoic2FuZHlsZWUiLCJhIjoiY2t3MGR4d2RsMHh4ZzJvbm9wb3dzNG9pbCJ9.kpIV-p6GnIpY0QIVGl0Svg',
    }).addTo(map);
};

/**
 * 初始查詢按鈕事件
 * 取得使用者輸入路線欄位資料
 *
 * @returns
 */
const searchEvent = async () => {
    const routeName = document.getElementById('routeSearch').value;
    const isDrivingPositive = document.getElementById('go-tab').getAttribute('aria-selected') === 'true';
    const busStationList = await getBusStation(routeName, isDrivingPositive); //RouteAPI StopUID
    const busDrivingTime = await getBusDriveTime(routeName, isDrivingPositive); //TimeAPI PlateNumb
    console.log(busDrivingTime, 'busDrivingTime');
    console.log(busStationList, 'busStationList');
    console.log(busStationList.pop(), '取最後一站');

    let renderData = '';
    let renderLastStop = '';
    let timeText = '';
    busStationList.forEach(item => {
        // console.log(item, 'item');
        // busDrivingTime.forEach(back => {
        //     console.log(back, 'back');
        //     Object.entries(back).forEach(stop => {
        //         console.log(stop, 'stop');
        //         if (stop.StopUID === item.StopUID) {
        //             const busID = back.PlateNumb;
        //             console.log(stop.EstimateTime, 'stopTime');
        //             const time = Math.floor(stop.EstimateTime / 60);
        //             console.log(busID, time, '公車車牌與時間');
        //             if (time === 0) {
        //                 timeText = '進站中';
        //             } else if (time <= 1 && 0 < time) {
        //                 timeText = '即將到站';
        //             } else if (!time) {
        //                 timeText = '--';
        //             } else {
        //                 timeText = `${time} 分鐘`;
        //             }
        //         }
        //     });
        // });
        renderData += `<li class="list-group-item d-flex align-items-center ">
                        <div class="d-flex">
                        <p class="timeColor border rounded-pill px-2 me-2 mb-0 bg-light">${timeText}</p>
                        <h5 class="fs-6 mb-0">${item.StopName.Zh_tw}</h5>
                        </div>
                    </li>
            `;
    });
    renderListData(renderData, isDrivingPositive);
    renderLastStop += `<span>往${busStationList.pop().StopName.Zh_tw}</span>`;
    renderLastStopData(renderLastStop, isDrivingPositive);
};

/**
 * 取得公車去程與返程的站名排序
 *
 * @param {*} routeName
 * @param {*} isPositive
 * @returns
 */
const getBusStation = (routeName, isPositive = true) => {
    return new Promise((resolve, reject) => {
        axios({
            method: 'get',
            url: `https://ptx.transportdata.tw/MOTC/v2/Bus/StopOfRoute/City/Taichung/${routeName}`,
            headers: GetAuthorizationHeader(),
        })
            .then(response => {
                const backData = response.data;
                const routeData = backData.filter(item => item.RouteID === routeName);
                const busDirectionIndex = isPositive ? 0 : 1;
                resolve(routeData[busDirectionIndex].Stops);
                renderBusRoute(routeName, value);
            })
            .catch(error => reject(error));
    });
};

/**
 * 取得公車預估進站時間
 *
 * @param {*} routeName
 * @param {*} isPositive
 * @returns
 */
const getBusDriveTime = (routeName, isPositive = true) => {
    return new Promise((resolve, reject) => {
        axios({
            method: 'get',
            url: `https://ptx.transportdata.tw/MOTC/v2/Bus/EstimatedTimeOfArrival/City/Taichung/${routeName}`,
            headers: GetAuthorizationHeader(),
        })
            .then(response => {
                // 篩出有在跑的公車
                const bus = response.data.filter(item => item.PlateNumb);
                const busPositiveData = bus.filter(item => !item.Direction);
                const busBackData = bus.filter(item => item.Direction);
                const result = isPositive ? busPositiveData : busBackData;
                const drivingData = []; //有在跑的公車之車牌號碼
                resolve(result);

                // 組出返程資料格式
                console.log(busBackData, 'busBackData');
                busBackData.forEach(item => {
                    const index = drivingData.map(item => item.plateNumb).indexOf(item.PlateNumb);
                    console.log(item, 'item');
                    console.log(index, 'index');
                    if (index === -1) {
                        // 代表沒找到
                        drivingData.push({
                            plateNumb: item.PlateNumb, //車牌號碼
                            stops: [
                                {
                                    estimateTime: item.EstimateTime, //到站時間預估(秒)
                                    stopUID: item.StopUID, //站牌唯一識別代碼
                                },
                            ],
                        });
                    } else {
                        // 有找到
                        drivingData[index].stops.push({
                            estimateTime: item.EstimateTime, //到站時間預估(秒)
                            stopUID: item.StopUID, //站牌唯一識別代碼
                        });
                    }
                });
                console.log('drivingData', drivingData);
                //有在跑的公車
            })
            .catch(error => reject('error', error));
    });
};

/**
 * 渲染列表資料
 *
 * @param {*} renderData
 * @param {*} isPositive
 */
const renderListData = (renderData, isPositive = true) => {
    document.getElementById('goList').innerHTML = '';
    document.getElementById('backList').innerHTML = '';
    isPositive
        ? (document.getElementById('goList').innerHTML = renderData)
        : (document.getElementById('backList').innerHTML = renderData);
};

const renderLastStopData = (renderLastStop, isPositive = true) => {
    document.getElementById('go-tab').innerHTML = '';
    document.getElementById('back-tab').innerHTML = '';
    isPositive
        ? (document.getElementById('go-tab').innerHTML = renderLastStop)
        : (document.getElementById('back-tab').innerHTML = renderLastStop);
};

/*
 * 公車路線畫線
 */
const renderBusRoute = routeName => {
    routeName.forEach(item => {
        const geo = item.StopPosition;
        console.group(item.StopPosition, 'StopPosition');
        // polyLine(geo);
    });
};
