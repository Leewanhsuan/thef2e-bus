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
    const isDrivingPositive = document.getElementById('go-tab').getAttribute('aria-selected') === 'true'; // TODO 需改為取得頁面去程按鈕或返程按鈕，判斷為 True or False
    const busStationList = await getBusStation(routeName, isDrivingPositive);
    const busDrivingTime = await getBusDriveTime(routeName, isDrivingPositive);

    let renderData = '';

    busStationList.forEach(item => {
        let timeText = 'timeText';
        //     backData.forEach(back => {
        //         back.stops.forEach(stop => {
        //             if (stop.stopUID === item.StopUID) {
        //                 busID = back.plateNumb;
        //                 time = Math.floor(stop.estimateTime / 60);
        //                 // console.log(busID, time)
        //                 // 文字顯示
        //                 if (time === 0) {
        //                     timeText = '進站中';
        //                 } else if (time <= 1 && 0 < time) {
        //                     timeText = '即將到站';
        //                 } else if (!time) {
        //                     timeText = '--';
        //                 } else {
        //                     timeText = `${time} 分鐘`;
        //                 }
        //             }
        //         });
        //     });
        renderData += `<li class="list-group-item d-flex align-items-center ">
                        <div class="d-flex">
                        <p class="timeColor border rounded-pill px-2 me-2 mb-0 bg-light">${timeText}</p>
                        <h5 class="fs-6 mb-0">${item.StopName.Zh_tw}</h5>
                        </div>
                    </li>
            `;
    });
    renderListData(renderData, isDrivingPositive);
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
                resolve(result);

                // 組出返程資料格式
                busBackData.forEach(item => {
                    // const index = backData.map(item => item.plateNumb).indexOf(item.PlateNumb);
                    // if (index === -1) {
                    //     // 代表沒找到
                    //     backData.push({
                    //         plateNumb: item.PlateNumb, //車牌號碼
                    //         stops: [
                    //             {
                    //                 estimateTime: item.EstimateTime, //到站時間預估(秒)
                    //                 stopUID: item.StopUID, //站牌唯一識別代碼
                    //             },
                    //         ],
                    //     });
                    // } else {
                    //     // 有找到
                    //     backData[index].stops.push({
                    //         estimateTime: item.EstimateTime, //到站時間預估(秒)
                    //         stopUID: item.StopUID, //站牌唯一識別代碼
                    //     });
                    // }
                });
                // console.log('backData', backData);
                // getBackRoute();
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
