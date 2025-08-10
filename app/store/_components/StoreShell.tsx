'use client'

export default function StoreShell({ children }: { children: React.ReactNode }) {
    return (
        <div className="d-flex">
        <nav
            className="d-flex flex-column flex-shrink-0 p-3 bg-primary text-white"
            style={{ width: '250px', minHeight: '100vh' }}
        >
            <a href="/store/dashboard" className="d-flex align-items-center mb-3 text-white text-decoration-none">
            <i className="bi bi-speedometer2 me-2"></i>
            <span className="fs-5">Store Dashboard</span>
            </a>
            <hr className="border-secondary" />
            <ul className="nav nav-pills flex-column mb-auto">
                <li className="nav-item">
                    <a href="/store/dashboard" className="nav-link text-white">
                    <i className="bi bi-people me-2"></i>
                    Home
                    </a>
                </li>
                <li className="nav-item">
                    <a href="/store/locations" className="nav-link text-white">
                    <i className="bi bi-people me-2"></i>
                    Your Locations
                    </a>
                </li>
                <li className="nav-item">
                    <a href="/store/surveys" className="nav-link text-white">
                    <i className="bi bi-people me-2"></i>
                    Surveys
                    </a>
                </li>
                <li className="nav-item">
                    <a href="/store/billing" className="nav-link text-white">
                    <i className="bi bi-people me-2"></i>
                    Billing
                    </a>
                </li>
            </ul>
            <hr className="border-secondary" />
            <a href="/store/logout" className="text-white text-decoration-none">
            <i className="bi bi-box-arrow-right me-2"></i>
            Logout
            </a>
        </nav>

        <main className="flex-grow-1 p-4 bg-light" style={{ minHeight: '100vh' }}>
            {children}
        </main>
        </div>
    )
}