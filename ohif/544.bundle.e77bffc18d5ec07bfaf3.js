"use strict";(globalThis.webpackChunk=globalThis.webpackChunk||[]).push([[544,481],{17919:(e,t,r)=>{r.r(t),r.d(t,{default:()=>S});var i=r(41766),a=r(78668),s=r(11374),n=r.n(s),o=r(14771),c=r.n(o),l=r(5085),d=r(61466),p=r.n(d);const m=e=>{const{list:t,itemGenerator:r}=e;if(t)return t.map((t=>{if(!t)return;const i=t.generator||r;if(!i)throw new Error(`No generator for ${t}`);return i({...e,item:t})}))};r(8291),r(44656);const h=(({topLeft:e=[],topRight:t=[],bottomLeft:r=[],bottomRight:a=[],itemGenerator:s=(()=>{})})=>n=>{const o="absolute pointer-events-none microscopy-viewport-overlay";return i.createElement(i.Fragment,null,e&&e.length>0&&i.createElement("div",{"data-cy":"viewport-overlay-top-left",className:p()(o,"top-viewport left-viewport text-primary-light")},m({...n,list:e,itemGenerator:s})),t&&t.length>0&&i.createElement("div",{"data-cy":"viewport-overlay-top-right",className:p()(o,"top-viewport right-viewport-scrollbar text-primary-light")},m({...n,list:t,itemGenerator:s})),a&&a.length>0&&i.createElement("div",{"data-cy":"viewport-overlay-bottom-right",className:p()(o,"bottom-viewport right-viewport-scrollbar text-primary-light")},m({...n,list:a,itemGenerator:s})),r&&r.length>0&&i.createElement("div",{"data-cy":"viewport-overlay-bottom-left",className:p()(o,"bottom-viewport left-viewport text-primary-light")},m({...n,list:r,itemGenerator:s})))})({});var v=r(55411),u=r(7206);var y=r(31426);function w(e){return!("object"==typeof e||Array.isArray(e))}const g=["DS","FL","FD","IS","OD","OF","OL","OV","SL","SS","SV","UL","US","UV"];function f(e,t){if(Array.isArray(e)){return e.map((e=>w(e)?e:f(e,t)))}return w(e)||Object.keys(e).forEach((r=>{null===e[r].Value&&e[r].vr?delete e[r].Value:Array.isArray(e[r].Value)&&e[r].vr&&(1===e[r].Value.length&&e[r].Value[0].BulkDataURI?(u.dicomWebUtils.fixBulkDataURI(e[r].Value[0],t,t.dataSourceConfig),e[r].BulkDataURI=e[r].Value[0].BulkDataURI,"https:"===window.location.protocol&&e[r].BulkDataURI.startsWith("http:")&&(e[r].BulkDataURI=e[r].BulkDataURI.replace("http:","https:")),delete e[r].Value):g.includes(e[r].vr)?e[r].Value=e[r].Value.map((e=>+e)):e[r].Value=e[r].Value.map((e=>f(e,t))))})),e}class I extends i.Component{constructor(e){super(e),this.state={error:null,isLoaded:!1},this.microscopyService=void 0,this.viewer=null,this.managedViewer=null,this.container=i.createRef(),this.overlayElement=i.createRef(),this.debouncedResize=void 0,this.setViewportActiveHandler=()=>{const{setViewportActive:e,viewportId:t,activeViewportId:r}=this.props;t!==r&&e(t)},this.onWindowResize=()=>{this.debouncedResize()};const{microscopyService:t}=this.props.servicesManager.services;this.microscopyService=t,this.debouncedResize=c()((()=>{this.viewer&&this.viewer.resize()}),100)}getNearbyROI(e,t=!0){const r=Object.getOwnPropertySymbols(this.viewer),i=r.find((e=>"drawingSource"===e.description)),a=r.find((e=>"pyramid"===e.description)),s=r.find((e=>"map"===e.description)),n=r.find((e=>"affine"===e.description)),o=this.viewer[i].getClosestFeatureToCoordinate(this.viewer[s].getEventCoordinate(e));if(!o)return null;const c=this.viewer._getROIFromFeature(o,this.viewer[a].metadata,this.viewer[n]);return c&&t&&this.microscopyService.selectAnnotation(c),c}async installOpenLayersRenderer(e,t){this.microscopyService.clearAnnotations();let i=t;"SR"===t.Modality&&(i=t.getSourceDisplaySet()),console.log("Loading viewer metadata",i),await(async i=>{const{viewer:a,metadata:s}=await r.e(525).then(r.t.bind(r,95226,23)),n=a.VolumeImageViewer,o=function({extensionManager:e,servicesManager:t}){const r=window.config.dataSources.find((t=>t.sourceName===e.activeDataSource)),{userAuthenticationService:i}=t.services,{wadoRoot:a,staticWado:s,singlepart:n}=r.configuration,o={url:a||"/dicomlocal",staticWado:s,singlepart:n,headers:i.getAuthorizationHeader(),errorInterceptor:v.r_.getHTTPErrorHandler()},c=new u.StaticWadoClient(o);return c.wadoURL=o.url,"dicomlocal"===e.activeDataSource&&(c.retrieveInstanceFrames=async e=>{if(!("studyInstanceUID"in e))throw new Error("Study Instance UID is required for retrieval of instance frames");if(!("seriesInstanceUID"in e))throw new Error("Series Instance UID is required for retrieval of instance frames");if(!("sopInstanceUID"in e))throw new Error("SOP Instance UID is required for retrieval of instance frames");if(!("frameNumbers"in e))throw new Error("frame numbers are required for retrieval of instance frames");console.log(`retrieve frames ${e.frameNumbers.toString()} of instance ${e.sopInstanceUID}`);const t=v.DicomMetadataStore.getInstance(e.studyInstanceUID,e.seriesInstanceUID,e.sopInstanceUID);return(Array.isArray(e.frameNumbers)?e.frameNumbers:e.frameNumbers.split(",")).map((e=>Array.isArray(t.PixelData)?t.PixelData[+e-1]:t.PixelData))}),c}({extensionManager:this.props.extensionManager,servicesManager:this.props.servicesManager}),c=[];i.forEach((e=>{e.ImageType="string"==typeof e.ImageType?e.ImageType.split("\\"):e.ImageType;const t=f(y.Ay.data.DicomMetaDictionary.denaturalizeDataset(e),{StudyInstanceUID:e.StudyInstanceUID,SeriesInstanceUID:e.SeriesInstanceUID,dataSourceConfig:this.props.dataSource.getConfig()});t["00480105"]||(t["00480105"]={vr:"SQ",Value:[{"00480106":{vr:"SH",Value:["1"]}}]});const r=new s.VLWholeSlideMicroscopyImage({metadata:t}),i=r.ImageType[2];"VOLUME"!==i&&"THUMBNAIL"!==i||c.push(r)}));const l={client:o,metadata:c,retrieveRendered:!1,controls:["overview","position"]};this.viewer=new n(l),this.overlayElement&&this.overlayElement.current&&this.viewer.addViewportOverlay&&this.viewer.addViewportOverlay({element:this.overlayElement.current,coordinates:[0,0],navigate:!0,className:"OpenLayersOverlay"}),this.viewer.render({container:e});const{StudyInstanceUID:d,SeriesInstanceUID:p}=t;this.managedViewer=this.microscopyService.addViewer(this.viewer,this.props.viewportId,e,d,p),this.managedViewer.addContextMenuCallback((e=>{}))})(i.others),"SR"===t.Modality&&t.load(i)}componentDidMount(){const{displaySets:e,viewportOptions:t}=this.props,r=e[0];this.installOpenLayersRenderer(this.container.current,r).then((()=>{this.setState({isLoaded:!0})}))}componentDidUpdate(e,t,r){if(this.managedViewer&&e.displaySets!==this.props.displaySets){const{displaySets:e}=this.props,t=e[0];if(this.microscopyService.clearAnnotations(),"SR"===t.Modality){const e=t.getSourceDisplaySet();t.load(e)}}}componentWillUnmount(){this.microscopyService.removeViewer(this.viewer)}render(){const e={width:"100%",height:"100%"},t=this.props.displaySets[0],r=t.firstInstance||t.instance;return i.createElement("div",{className:"DicomMicroscopyViewer",style:e,onClick:this.setViewportActiveHandler},i.createElement("div",{style:{...e,display:"none"}},i.createElement("div",{style:{...e},ref:this.overlayElement},i.createElement("div",{style:{position:"relative",height:"100%",width:"100%"}},t&&r.imageId&&i.createElement(h,{displaySet:t,instance:t.instance,metadata:t.metadata})))),a.Ay&&i.createElement(a.Ay,{handleWidth:!0,handleHeight:!0,onResize:this.onWindowResize}),this.state.error?i.createElement("h2",null,JSON.stringify(this.state.error)):i.createElement("div",{style:e,ref:this.container}),this.state.isLoaded?null:i.createElement(l.Jx,{className:"h-full w-full bg-black"}))}}I.propTypes={viewportData:n().object,activeViewportId:n().string,setViewportActive:n().func,displaySets:n().array,viewportId:n().string,viewportLabel:n().string,dataSource:n().object,viewportOptions:n().object,displaySetOptions:n().array,servicesManager:n().object,extensionManager:n().object,commandsManager:n().object};const S=I}}]);
//# sourceMappingURL=544.bundle.e77bffc18d5ec07bfaf3.js.map