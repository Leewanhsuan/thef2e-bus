import '../../style/main.css';
import { GetAuthorizationHeader } from '../../utils/commonApi';

/**
 * 頁面載入處理事件
 */

let map;

window.addEventListener('load', () => {
    //嵌入地圖
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

    // 路線名稱
    let routeName = '';

    routeSearch.addEventListener('blur', function(e) {
        routeName = e.target.value;
        console.log('routeName', routeName);
    });

    // get 公車預估到站資料
    let busData = [];
    let goData = [];
    let backData = [];
    const searchBtn = document.querySelector('#searchBtn');

    function getBus() {
        axios({
            method: 'get',
            url: `https://ptx.transportdata.tw/MOTC/v2/Bus/EstimatedTimeOfArrival/City/Taichung/${routeName}`,
            headers: GetAuthorizationHeader(),
        })
            .then(response => {
                console.log('預估', response);
                const data = response.data;
                console.log('回傳資料', response.data);

                // 篩出有在跑的公車
                const bus = data.filter(item => item.PlateNumb);

                //「去程0」與「返程1」
                const getGoData = bus.filter(item => !item.Direction);
                const getBackData = bus.filter(item => item.Direction);

                console.log('getGoData', getGoData);
                console.log('getBackData', getBackData);

                // 組出返程資料格式
                getBackData.forEach(item => {
                    const index = backData.map(item => item.plateNumb).indexOf(item.PlateNumb);

                    if (index === -1) {
                        // 代表沒找到
                        backData.push({
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
                        backData[index].stops.push({
                            estimateTime: item.EstimateTime, //到站時間預估(秒)
                            stopUID: item.StopUID, //站牌唯一識別代碼
                        });
                    }
                });
                console.log('backData', backData);
                getBackRoute();

                // 組出去程資料格式
                getGoData.forEach(item => {
                    const index = goData.map(item => item.plateNumb).indexOf(item.PlateNumb);

                    if (index === -1) {
                        goData.push({
                            plateNumb: item.PlateNumb,
                            stops: [
                                {
                                    estimateTime: item.EstimateTime,
                                    stopUID: item.StopUID,
                                },
                            ],
                        });
                    } else {
                        goData[index].stops.push({
                            estimateTime: item.EstimateTime,
                            stopUID: item.StopUID,
                        });
                    }
                });
                console.log('goData', goData);
                getGoRoute();
            })
            .catch(error => console.log('error', error));
    }

    searchBtn.addEventListener('click', getBus);

    // get 公車路線站序資料
    const goList = document.querySelector('#goList');
    const backList = document.querySelector('#backList');

    function getBackRoute() {
        axios({
            method: 'get',
            url: `https://ptx.transportdata.tw/MOTC/v2/Bus/StopOfRoute/City/Taichung/${routeName}`,
            headers: GetAuthorizationHeader(),
        })
            .then(response => {
                console.log('返程列表', response);
                const data = response.data;

                const routeData = data.filter(item => item.RouteID === routeName);

                // 返程
                let backStr = '';
                let busID = '';
                let time = 0;
                let timeText = '';

                routeData[1].Stops.forEach(item => {
                    backData.forEach(back => {
                        back.stops.forEach(stop => {
                            if (stop.stopUID === item.StopUID) {
                                busID = back.plateNumb;
                                time = Math.floor(stop.estimateTime / 60);
                                // console.log(busID, time)

                                // 文字顯示
                                if (time === 0) {
                                    timeText = '進站中';
                                } else if (time <= 1 && 0 < time) {
                                    timeText = '即將到站';
                                } else if (!time) {
                                    timeText = '--';
                                } else {
                                    timeText = `${time} 分鐘`;
                                }
                            }
                        });
                    });
                    backStr += `<li class="list-group-item d-flex align-items-center justify-content-between">
                <div class="d-flex align-items-center ">
                <p class="timeColor border rounded-pill px-2 me-2 mb-0 bg-light">${timeText}</p>
                <h5 class="fs-6 mb-0">${item.StopUID}/${item.StopName.Zh_tw}</h5>
                </div>
                <p class="mb-0 text-primary">${busID}</p>
            </li>
        `;
                });
                backList.innerHTML = backStr;
            })
            .catch(error => console.log('error', error));
    }

    function getGoRoute() {
        axios({
            method: 'get',
            url: `https://ptx.transportdata.tw/MOTC/v2/Bus/StopOfRoute/City/Taichung/${routeName}`,
            headers: GetAuthorizationHeader(),
        })
            .then(response => {
                console.log('去程列表', response);
                const data = response.data;

                const routeData = data.filter(item => item.RouteID === routeName);

                // 返程
                let goStr = '';
                let busID = '';
                let time = 0;
                let timeText = '';

                routeData[1].Stops.forEach(item => {
                    goData.forEach(go => {
                        go.stops.forEach(stop => {
                            if (stop.stopUID === item.StopUID) {
                                busID = go.plateNumb;
                                time = Math.floor(stop.estimateTime / 60);
                                // console.log(busID, time)

                                // 文字顯示
                                if (time === 0) {
                                    timeText = '進站中';
                                } else if (time <= 1 && 0 < time) {
                                    timeText = '即將到站';
                                } else if (!time) {
                                    timeText = '--';
                                } else {
                                    timeText = `${time} 分鐘`;
                                }
                            }
                        });
                    });
                    goStr += `<li class="list-group-item d-flex align-items-center justify-content-between">
                <div class="d-flex align-items-center ">
                <p class="timeColor border rounded-pill px-2 me-2 mb-0 bg-light">${timeText}</p>
                <h5 class="fs-6 mb-0">${item.StopUID}/${item.StopName.Zh_tw}</h5>
                </div>
                <p class="mb-0 text-primary">${busID}</p>
            </li>
        `;
                });
                goList.innerHTML = goStr;
            })
            .catch(error => console.log('error', error));
    }
    //分頁
});
