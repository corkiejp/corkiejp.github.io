const style = document.createElement('style');
style.textContent = `
  .frame.css-ab90li-frameStyles-root {
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    width: 100vw !important;
    height: 100vh !important;
    margin: 0 !important;
    padding: 0 !important;
    z-index: 2147483647 !important;
    border-radius: 0 !important;
    background: #fff !important;
    display: flex !important;
    flex-direction: column !important;
    box-sizing: border-box !important;
    overflow: hidden !important; /* Hide scroll in popup frame */
  }
  
  .css-105zbr5-frameStyles-headerWrap,
  .css-17r3ree-frameStyles-footerWrap {
    flex: 0 0 auto !important; /* Fixed size header/footer */
    width: 100% !important;
  }
  
  .css-1usqrh9-frameStyles-bodyWrap {
    flex: 1 1 auto !important;  /* Flexible scrollable body */
    width: 100% !important;
    overflow-y: auto !important;
    -webkit-overflow-scrolling: touch !important;
  }
  
  .frameHeader,
  .frameBody {
    width: 100% !important;
    max-width: 100% !important;
  }
  
  .buttonClose, .closeButton {
    position: absolute !important;
    top: 8px !important;
    right: 8px !important;
    z-index: 2147483648 !important;
    background: transparent;
  }
`;
document.head.appendChild(style);
