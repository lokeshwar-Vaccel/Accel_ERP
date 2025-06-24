import React from 'react';
import { Link } from 'react-router-dom';

interface BreadcrumbProps {
    pathSegments: string[];
    baseLabel?: string;
}

const toTitleCase = (str: string) =>
    str
        .split('-')
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
        .join(' ');

const Breadcrumb: React.FC<BreadcrumbProps> = ({ pathSegments, baseLabel = 'Home' }) => {

    const paths = pathSegments.map((segment, index) => ({
        name: toTitleCase(segment),
        path: '/' + pathSegments.slice(0, index + 1).join('/'),
    }));

    return (
        <nav
            className="flex items-center px-5 py-2 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"
            aria-label="Breadcrumb"
        >
            {/* Breadcrumb Path */}
            <ol className="inline-flex items-center space-x-1 md:space-x-2 rtl:space-x-reverse">
                <li className="inline-flex items-center">
                    <Link
                        to="/"
                        className="inline-flex items-center text-sm font-medium text-gray-300 hover:text-white transition-colors duration-200"
                    >
                        <svg
                            className="w-3 h-3 me-2.5"
                            aria-hidden="true"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                        >
                            <path d="m19.707 9.293-2-2-7-7a1 1 0 0 0-1.414 0l-7 7-2 2a1 1 0 0 0 1.414 1.414L2 10.414V18a2 2 0 0 0 2 2h3a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1h3a2 2 0 0 0 2-2v-7.586l.293.293a1 1 0 0 0 1.414-1.414Z" />
                        </svg>
                        {baseLabel}
                    </Link>
                </li>
                {paths.map((item, index) => (
                    <li key={item.path} aria-current={index === paths.length - 1 ? 'page' : undefined}>
                        <div className="flex items-center">
                            <svg
                                className="rtl:rotate-180 block w-3 h-3 mx-1 text-gray-500"
                                aria-hidden="true"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 6 10"
                            >
                                <path
                                    stroke="currentColor"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="m1 9 4-4-4-4"
                                />
                            </svg>
                            {index === paths.length - 1 ? (
                                <span className="ms-1 text-sm font-medium text-white md:ms-2">
                                    {item.name}
                                </span>
                            ) : (
                                <Link
                                    to={item.path}
                                    className="ms-1 text-sm font-medium text-gray-300 hover:text-white md:ms-2 transition-colors duration-200"
                                >
                                    {item.name}
                                </Link>
                            )}
                        </div>
                    </li>
                ))}
            </ol>
        </nav>
    );
};

export default Breadcrumb;
