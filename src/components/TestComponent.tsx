import React from 'react';

interface TestComponentProps {
  message: string;
}

const TestComponent: React.FC<TestComponentProps> = ({ message }) => {
  return (
    <div className="p-4 bg-gray-100 rounded-lg">
      <h3 className="text-lg font-bold">Test Component</h3>
      <p>{message}</p>
    </div>
  );
};

export default TestComponent; 